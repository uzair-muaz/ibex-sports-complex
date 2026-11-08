import { describe, expect, it } from "vitest";
import { csvCell, parseReportRange, rangeMoments, summariseReportBookings, sumBy, toCsv } from "@/lib/report-rules";
import { getOpenApiDocument } from "@/lib/api/openapi";

describe("report dates", () => {
  it("checks the range", () => {
    expect(parseReportRange("2026-11-01", "2026-11-30").ok).toBe(true);
    expect(parseReportRange("2026-11-31", "2026-12-01").ok).toBe(false);
    expect(parseReportRange("2026-11-30", "2026-11-01").ok).toBe(false);
    expect(parseReportRange("2025-01-01", "2026-11-30").ok).toBe(false);
    expect(parseReportRange(null, "2026-11-30").ok).toBe(false);
  });

  it("uses whole Pakistan days", () => {
    const { start, end } = rangeMoments({ from: "2026-11-01", to: "2026-11-30" });
    expect(start.toISOString()).toBe("2026-10-31T19:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T19:00:00.000Z");
  });
});

describe("booking money", () => {
  const s = summariseReportBookings([
    {
      status: "confirmed", sport: "PADEL", source: "app", duration: 1, originalPrice: 6000, discountAmount: 600,
      discounts: [{ name: "Happy hour", amountSaved: 600 }], promoCode: "EID20", promoDiscountPkr: 540, loyaltyDiscountPkr: 100,
      totalPrice: 4760, amountReceivedOnline: 2000, amountReceivedCash: 0, amountPaid: 2000, walletCreditUsed: 500,
    },
    { status: "completed", sport: "FUTSAL", duration: 1.5, originalPrice: 5000, totalPrice: 5000, amountPaid: 5000 },
    { status: "cancelled", sport: "PADEL", duration: 1, totalPrice: 6000, amountPaid: 3000, refundAmount: 3000 },
  ]);

  it("adds up what came in and what is owed", () => {
    expect(s.count).toBe(2);
    expect(s.courtFees).toBe(11000);
    expect(s.total).toBe(9760);
    expect(s.online).toBe(2000);
    expect(s.unsplit).toBe(5000);
    expect(s.wallet).toBe(500);
    expect(s.received).toBe(7500);
    expect(s.due).toBe(2260);
  });

  it("splits by sport, source, discount and code", () => {
    expect(s.bySport.map((x) => x.sport)).toEqual(["FUTSAL", "PADEL"]);
    expect(s.bySource).toEqual([{ key: "web", count: 1, pkr: 5000 }, { key: "app", count: 1, pkr: 4760 }]);
    expect(s.autoDiscountUse).toEqual([{ key: "Happy hour", count: 1, pkr: 600 }]);
    expect(s.promoUse).toEqual([{ key: "EID20", count: 1, pkr: 540 }]);
    expect(s.cancelled).toEqual({ count: 1, toWallet: 3000, paidBack: 0 });
  });

  it("sums by key", () => {
    expect(sumBy([{ t: "a", v: 2 }, { t: "b", v: 5 }, { t: "a", v: 4 }], (r) => r.t, (r) => r.v)).toEqual([
      { key: "a", count: 2, pkr: 6 },
      { key: "b", count: 1, pkr: 5 },
    ]);
  });
});

describe("spreadsheet", () => {
  it("quotes and blocks formulas", () => {
    expect(csvCell('Ali, "Khan"')).toBe('"Ali, ""Khan"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-500)).toBe("-500");
    expect(csvCell(null)).toBe("");
  });

  it("starts with the Excel mark", () => {
    expect(toCsv(["A", "B"], [[1, "x"]])).toBe("﻿A,B\r\n1,x\r\n");
  });

  it("is in the docs", () => {
    const paths = Object.keys((getOpenApiDocument() as { paths: Record<string, unknown> }).paths);
    expect(paths).toContain("/api/v1/admin/reports");
    expect(paths).toContain("/api/v1/admin/reports/export");
  });
});
