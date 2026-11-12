import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { summariseBookings } from "@/lib/admin-customer";

const row = (o: Record<string, unknown>) => ({
  _id: new mongoose.Types.ObjectId(),
  serialNumber: 100,
  date: "2026-12-01",
  startTime: 18,
  duration: 1,
  status: "confirmed",
  totalPrice: 4000,
  amountPaid: 0,
  userId: new mongoose.Types.ObjectId(),
  courtId: { name: "Padel Court 1", type: "PADEL" },
  ...o,
});

describe("customer page totals", () => {
  it("counts bookings, money kept and money still owed", () => {
    const now = Date.parse("2026-11-08T12:00:00+05:00");
    const { bookings, stats } = summariseBookings(
      [
        row({ amountPaid: 2000, walletCreditUsed: 500 }), // upcoming, 1,500 due
        row({ status: "completed", date: "2026-10-01", amountPaid: 4000 }),
        row({ status: "cancelled", amountPaid: 2000, refundAmount: 2000 }),
        row({ status: "pending_payment", date: "2026-11-01", userId: null }), // past, guest, 4,000 due
      ] as never,
      now,
    );
    expect(stats).toEqual({ total: 4, upcoming: 1, completed: 1, cancelled: 1, paidTotal: 6500, dueTotal: 5500 });
    expect(bookings[0]).toMatchObject({ reference: "IBX-100", paid: 2500, due: 1500, sport: "PADEL", guest: false });
    expect(bookings[2]).toMatchObject({ due: 0, refundToWallet: 2000 });
    expect(bookings[3].guest).toBe(true);
  });
});
