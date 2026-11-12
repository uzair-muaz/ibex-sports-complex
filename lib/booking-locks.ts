import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import SlotLock from "@/models/SlotLock";
import Booking from "@/models/Booking";
import { dayIndex } from "@/lib/booking-overlap";

/** How long a lock may point at a booking that isn't saved yet. */
const PENDING_GRACE_MS = 2 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["pending_payment", "confirmed", "completed"]);

/** Absolute half-hour numbers a booking covers (works across midnight). */
export function cellsFor(dateKey: string, startHour: number, durationHours: number): number[] {
  const first = dayIndex(dateKey) * 48 + Math.round(startHour * 2);
  const count = Math.round(durationHours * 2);
  return Array.from({ length: count }, (_, i) => first + i);
}

/** Does this booking (as it is now) still cover the half hour? */
export function bookingCoversCell(
  booking: { date: string; startTime: number; duration: number },
  cell: number,
): boolean {
  const cells = cellsFor(booking.date, booking.startTime, booking.duration);
  return cells.includes(cell);
}

/**
 * A lock is "stale" (safe to take over) when its booking was cancelled,
 * moved, deleted, or never saved. Locks heal themselves this way, so
 * cancel / edit / delete code doesn't have to remember to release them.
 */
async function isStale(lock: {
  courtId: mongoose.Types.ObjectId;
  cell: number;
  bookingId: mongoose.Types.ObjectId;
  updatedAt: Date;
}): Promise<boolean> {
  const booking = await Booking.findById(lock.bookingId)
    .select("courtId date startTime duration status")
    .lean();
  if (!booking) return Date.now() - new Date(lock.updatedAt).getTime() > PENDING_GRACE_MS;
  if (!ACTIVE_STATUSES.has(booking.status)) return true;
  if (String(booking.courtId) !== String(lock.courtId)) return true;
  return !bookingCoversCell(booking, lock.cell);
}

function isDuplicateKey(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Claim every half hour of a booking for `bookingId`. All or nothing:
 * if any half hour is held by another live booking, nothing is kept.
 */
export async function acquireSlotLocks(params: {
  courtId: mongoose.Types.ObjectId | string;
  bookingId: mongoose.Types.ObjectId;
  dateKey: string;
  startHour: number;
  durationHours: number;
}): Promise<boolean> {
  await connectDB();
  const courtId = new mongoose.Types.ObjectId(String(params.courtId));
  const cells = cellsFor(params.dateKey, params.startHour, params.durationHours);
  const taken: number[] = [];

  for (const cell of cells) {
    // A day after the half hour, MongoDB deletes the row.
    const expiresAt = new Date((Math.floor(cell / 48) + 2) * 86_400_000);
    try {
      await SlotLock.create({ courtId, cell, bookingId: params.bookingId, expiresAt });
      taken.push(cell);
      continue;
    } catch (err) {
      if (!isDuplicateKey(err)) {
        await releaseCells(courtId, params.bookingId, taken);
        throw err;
      }
    }

    const existing = await SlotLock.findOne({ courtId, cell }).lean();
    let got = false;
    if (existing && (await isStale(existing))) {
      // Take it over only if nobody else did in the meantime.
      const res = await SlotLock.updateOne(
        { _id: existing._id, bookingId: existing.bookingId },
        { $set: { bookingId: params.bookingId, expiresAt } },
      );
      got = res.modifiedCount === 1;
    }
    if (!got) {
      await releaseCells(courtId, params.bookingId, taken);
      return false;
    }
    taken.push(cell);
  }
  return true;
}

async function releaseCells(
  courtId: mongoose.Types.ObjectId,
  bookingId: mongoose.Types.ObjectId,
  cells: number[],
) {
  if (cells.length === 0) return;
  await SlotLock.deleteMany({ courtId, bookingId, cell: { $in: cells } });
}

/** Give back every half hour held for a booking (used when creating it fails). */
export async function releaseSlotLocks(bookingId: mongoose.Types.ObjectId | string) {
  await connectDB();
  await SlotLock.deleteMany({ bookingId: new mongoose.Types.ObjectId(String(bookingId)) });
}
