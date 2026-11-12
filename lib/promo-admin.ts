/** Super admin: manage promo codes. Server-only. */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import PromoCode from "@/models/PromoCode";
import PromoRedemption from "@/models/PromoRedemption";
import { validatePromoInput } from "@/lib/promo-rules";
import { toPkIso } from "@/lib/api/time";

type Fail = { ok: false; status: number; code: string; error: string };
const bad = (error: string, code = "VALIDATION_ERROR", status = 400): Fail => ({ ok: false, status, code, error });

type PromoLean = {
  _id: mongoose.Types.ObjectId;
  code: string;
  description?: string;
  type: "percentage" | "fixed";
  value: number;
  maxDiscountPkr?: number | null;
  minFeePkr?: number | null;
  sports: string[];
  validFrom?: Date | null;
  validUntil?: Date | null;
  maxUses?: number | null;
  maxUsesPerCustomer: number;
  newCustomersOnly: boolean;
  isActive: boolean;
  usedCount: number;
  createdAt: Date;
};

function view(p: PromoLean, totalOff = 0) {
  return {
    id: p._id.toString(),
    code: p.code,
    description: p.description ?? "",
    type: p.type,
    value: p.value,
    maxDiscountPkr: p.maxDiscountPkr ?? null,
    minFeePkr: p.minFeePkr ?? null,
    sports: p.sports ?? [],
    validFrom: p.validFrom ? toPkIso(p.validFrom) : null,
    validUntil: p.validUntil ? toPkIso(p.validUntil) : null,
    maxUses: p.maxUses ?? null,
    maxUsesPerCustomer: p.maxUsesPerCustomer,
    newCustomersOnly: p.newCustomersOnly,
    isActive: p.isActive,
    usedCount: p.usedCount,
    /** PKR taken off on bookings that weren't cancelled. */
    totalDiscountPkr: totalOff,
    createdAt: toPkIso(p.createdAt),
  };
}
export type AdminPromo = ReturnType<typeof view>;

export async function listPromos() {
  await connectDB();
  const [promos, totals] = await Promise.all([
    PromoCode.find().sort({ createdAt: -1 }).lean(),
    PromoRedemption.aggregate<{ _id: mongoose.Types.ObjectId; off: number }>([
      { $match: { status: "used" } },
      { $group: { _id: "$promoId", off: { $sum: "$discountPkr" } } },
    ]),
  ]);
  const off = new Map(totals.map((t) => [t._id.toString(), t.off]));
  return (promos as unknown as PromoLean[]).map((p) => view(p, off.get(p._id.toString()) ?? 0));
}

export async function createPromo(body: unknown, staffId: string): Promise<{ ok: true; promo: AdminPromo } | Fail> {
  const v = validatePromoInput(body);
  if (!v.ok) return bad(v.error);
  await connectDB();
  try {
    const p = await PromoCode.create({ ...v.value, createdBy: staffId });
    return { ok: true, promo: view(p.toObject() as unknown as PromoLean) };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return bad("A promo code with this name already exists.", "DUPLICATE", 409);
    throw err;
  }
}

export async function updatePromo(id: string, body: unknown): Promise<{ ok: true; promo: AdminPromo } | Fail> {
  if (!mongoose.isValidObjectId(id)) return bad("Promo code not found", "NOT_FOUND", 404);
  const v = validatePromoInput(body, { partial: true });
  if (!v.ok) return bad(v.error);
  await connectDB();
  const current = await PromoCode.findById(id);
  if (!current) return bad("Promo code not found", "NOT_FOUND", 404);
  // The code text can't change once it was used (bookings and receipts show it).
  if (v.value.code && v.value.code !== current.code && current.usedCount > 0) {
    return bad("This code was already used, so its name can't change. Make a new code instead.", "CODE_IN_USE", 409);
  }
  const type = v.value.type ?? current.type;
  const value = v.value.value ?? current.value;
  if (type === "percentage" && value > 100) return bad("Percent off must be 1 to 100.");
  const from = v.value.validFrom !== undefined ? v.value.validFrom : current.validFrom;
  const until = v.value.validUntil !== undefined ? v.value.validUntil : current.validUntil;
  if (from && until && new Date(until) <= new Date(from)) return bad("The end date must be after the start date.");
  current.set(v.value);
  try {
    await current.save();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return bad("A promo code with this name already exists.", "DUPLICATE", 409);
    throw err;
  }
  return { ok: true, promo: view(current.toObject() as unknown as PromoLean) };
}

/** Delete only a code nobody used; a used code is switched off instead. */
export async function deletePromo(id: string): Promise<{ ok: true } | Fail> {
  if (!mongoose.isValidObjectId(id)) return bad("Promo code not found", "NOT_FOUND", 404);
  await connectDB();
  if (await PromoRedemption.exists({ promoId: id })) {
    return bad("This code was used on bookings, so it can't be deleted. Switch it off instead.", "CODE_IN_USE", 409);
  }
  const r = await PromoCode.deleteOne({ _id: id });
  if (!r.deletedCount) return bad("Promo code not found", "NOT_FOUND", 404);
  return { ok: true };
}

/** Who used a code (newest first). */
export async function promoUses(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  const rows = await PromoRedemption.find({ promoId: id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("bookingId", "serialNumber date startTime userName")
    .lean();
  return rows.map((r) => {
    const b = r.bookingId as unknown as { _id: mongoose.Types.ObjectId; serialNumber?: number; date?: string; userName?: string } | null;
    return {
      id: r._id.toString(),
      bookingId: b?._id.toString() ?? null,
      bookingRef: b?.serialNumber ? `IBX-${b.serialNumber}` : null,
      bookingDate: b?.date ?? null,
      customer: b?.userName ?? r.email,
      email: r.email,
      userId: r.userId ? r.userId.toString() : null,
      discountPkr: r.discountPkr,
      status: r.status,
      date: toPkIso(r.createdAt),
    };
  });
}
