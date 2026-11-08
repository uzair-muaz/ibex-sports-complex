/** Admin: manage closures (times courts can't be booked). Server-only. */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Closure from "@/models/Closure";
import Court from "@/models/Court";
import Booking from "@/models/Booking";
import { overlapsBooking } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { closureSpan, closureText, pkDateKey, validateClosureInput, type ClosureInput } from "@/lib/closure-rules";
import { bookingReference } from "@/lib/api/booking-view";
import { toPkIso } from "@/lib/api/time";

type Fail = { ok: false; status: number; code: string; error: string };
const bad = (error: string, code = "VALIDATION_ERROR", status = 400): Fail => ({ ok: false, status, code, error });

type ClosureLean = {
  _id: mongoose.Types.ObjectId;
  courtIds: mongoose.Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  reason: string;
  publicNote?: string;
  createdAt: Date;
};

async function courtNames(): Promise<Map<string, { name: string; type: string }>> {
  const courts = await Court.find().select("name type").lean();
  return new Map(courts.map((c) => [c._id.toString(), { name: c.name, type: c.type }]));
}

function view(c: ClosureLean, names: Map<string, { name: string; type: string }>, affected?: number) {
  const ids = c.courtIds.map(String);
  return {
    id: c._id.toString(),
    courtIds: ids,
    /** "All courts" or the court names. */
    courts: ids.length ? ids.map((id) => names.get(id)?.name ?? "Removed court") : ["All courts"],
    startsAt: toPkIso(c.startsAt)!,
    endsAt: toPkIso(c.endsAt)!,
    reason: c.reason,
    publicNote: c.publicNote ?? "",
    /** What customers see. */
    customerText: closureText(c),
    /** Active bookings inside this time (only when asked). */
    affectedBookings: affected ?? null,
    createdAt: toPkIso(c.createdAt),
  };
}
export type AdminClosure = ReturnType<typeof view>;

/** Active bookings (pending or confirmed) inside the closure's time and courts. */
async function findAffected(c: Pick<ClosureLean, "courtIds" | "startsAt" | "endsAt">) {
  const span = closureSpan(c);
  const days: string[] = [];
  for (let d = shiftDateKey(pkDateKey(c.startsAt), -1); d <= pkDateKey(c.endsAt); d = shiftDateKey(d, 1)) days.push(d);
  const rows = await Booking.find({
    ...(c.courtIds.length ? { courtId: { $in: c.courtIds } } : {}),
    date: { $in: days },
    status: { $in: ["pending_payment", "confirmed"] },
  })
    .select("serialNumber date startTime duration status userId userName userEmail userPhone courtId totalPrice amountPaid")
    .populate("courtId", "name")
    .sort({ date: 1, startTime: 1 })
    .lean();
  return rows.filter((b) => overlapsBooking(span.date, span.startTime, span.duration, b));
}

export async function listClosures(opts: { includePast?: boolean } = {}) {
  await connectDB();
  const [rows, names] = await Promise.all([
    Closure.find(opts.includePast ? {} : { endsAt: { $gt: new Date() } })
      .sort({ startsAt: opts.includePast ? -1 : 1 })
      .limit(200)
      .lean<ClosureLean[]>(),
    courtNames(),
  ]);
  const counts = await Promise.all(rows.map((c) => (c.endsAt > new Date() ? findAffected(c).then((l) => l.length) : 0)));
  return rows.map((c, i) => view(c, names, counts[i]));
}

async function checkCourts(ids: string[]): Promise<Fail | null> {
  if (!ids.length) return null;
  const found = await Court.countDocuments({ _id: { $in: ids } });
  return found === ids.length ? null : bad("One of the courts wasn't found.", "COURT_NOT_FOUND", 404);
}

export async function createClosure(body: unknown, staffId: string) {
  const v = validateClosureInput(body);
  if (!v.ok) return bad(v.error);
  await connectDB();
  const courtError = await checkCourts(v.value.courtIds);
  if (courtError) return courtError;
  const doc = await Closure.create({ ...v.value, createdBy: staffId });
  const c = doc.toObject() as unknown as ClosureLean;
  const affected = await findAffected(c);
  return { ok: true as const, closure: view(c, await courtNames(), affected.length) };
}

export async function updateClosure(id: string, body: unknown) {
  if (!mongoose.isValidObjectId(id)) return bad("Closure not found", "NOT_FOUND", 404);
  await connectDB();
  const current = await Closure.findById(id).lean<ClosureLean>();
  if (!current) return bad("Closure not found", "NOT_FOUND", 404);
  const existing: ClosureInput = {
    courtIds: current.courtIds.map(String),
    startsAt: current.startsAt,
    endsAt: current.endsAt,
    reason: current.reason,
    publicNote: current.publicNote ?? "",
  };
  const v = validateClosureInput(body, { partial: true, existing });
  if (!v.ok) return bad(v.error);
  const courtError = await checkCourts(v.value.courtIds);
  if (courtError) return courtError;
  const saved = await Closure.findByIdAndUpdate(id, { $set: v.value }, { new: true }).lean<ClosureLean>();
  if (!saved) return bad("Closure not found", "NOT_FOUND", 404);
  const affected = await findAffected(saved);
  return { ok: true as const, closure: view(saved, await courtNames(), affected.length) };
}

/** Removing a closure opens the time for booking again. */
export async function deleteClosure(id: string): Promise<{ ok: true } | Fail> {
  if (!mongoose.isValidObjectId(id)) return bad("Closure not found", "NOT_FOUND", 404);
  await connectDB();
  const r = await Closure.deleteOne({ _id: id });
  return r.deletedCount ? { ok: true } : bad("Closure not found", "NOT_FOUND", 404);
}

/** The closure and the bookings inside it, so staff can call or cancel them. */
export async function closureDetails(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const c = await Closure.findById(id).lean<ClosureLean>();
  if (!c) return null;
  const affected = await findAffected(c);
  return {
    closure: view(c, await courtNames(), affected.length),
    bookings: affected.map((b) => ({
      id: b._id.toString(),
      reference: bookingReference(b),
      date: b.date,
      startTime: b.startTime,
      duration: b.duration,
      status: b.status,
      court: (b.courtId as unknown as { name?: string } | null)?.name ?? null,
      customer: { userId: b.userId ? String(b.userId) : null, name: b.userName, email: b.userEmail, phone: b.userPhone },
      total: Math.round(b.totalPrice ?? 0),
      paid: Math.round(b.amountPaid ?? 0),
    })),
  };
}

/** Customers: closures coming up in the next `days` days (no staff reasons). */
export async function upcomingClosures(days = 30) {
  await connectDB();
  const now = new Date();
  const [rows, names] = await Promise.all([
    Closure.find({ endsAt: { $gt: now }, startsAt: { $lt: new Date(now.getTime() + days * 86_400_000) } })
      .sort({ startsAt: 1 })
      .limit(50)
      .lean<ClosureLean[]>(),
    courtNames(),
  ]);
  return rows.map((c) => {
    const ids = c.courtIds.map(String);
    return {
      id: c._id.toString(),
      allCourts: ids.length === 0,
      courts: ids.map((id) => ({ id, name: names.get(id)?.name ?? null, sport: names.get(id)?.type ?? null })),
      start: toPkIso(c.startsAt)!,
      end: toPkIso(c.endsAt)!,
      note: closureText(c),
    };
  });
}

/** Who to tell about a closure: account holders with a booking inside it, and how many guest bookings. */
export async function closureCustomers(id: string): Promise<{ userIds: string[]; guestBookings: number } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const c = await Closure.findById(id).lean<ClosureLean>();
  if (!c) return null;
  const affected = await findAffected(c);
  const userIds = [...new Set(affected.filter((b) => b.userId).map((b) => String(b.userId)))];
  return { userIds, guestBookings: affected.filter((b) => !b.userId).length };
}
