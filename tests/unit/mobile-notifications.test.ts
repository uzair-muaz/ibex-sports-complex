import { afterEach, describe, expect, it } from "vitest";
import { dueForReminder } from "@/lib/notifications/reminders";
import { toAppNotification } from "@/lib/notifications/inbox";
import { readServiceAccount } from "@/lib/notifications/push";
import { sendSwitches } from "@/lib/notifications";
import { startLabel } from "@/lib/notifications/events";

const at = (iso: string) => Date.parse(iso);
// Match at 18:00 PKT on 18 Nov, booked days earlier.
const booking = { date: "2026-11-18", startTime: 18, createdAt: "2026-11-10T10:00:00+05:00" };

describe("2-hour reminder timing", () => {
  it("not yet at 15:59", () => expect(dueForReminder(booking, at("2026-11-18T15:59:00+05:00"))).toBe(false));
  it("yes from 16:00", () => expect(dueForReminder(booking, at("2026-11-18T16:00:00+05:00"))).toBe(true));
  it("yes at 17:45 (job ran late)", () => expect(dueForReminder(booking, at("2026-11-18T17:45:00+05:00"))).toBe(true));
  it("no once it started", () => expect(dueForReminder(booking, at("2026-11-18T18:00:00+05:00"))).toBe(false));
  it("no if booked inside the 2 hours", () =>
    expect(dueForReminder({ ...booking, createdAt: "2026-11-18T17:00:00+05:00" }, at("2026-11-18T17:10:00+05:00"))).toBe(false));
  it("works across midnight", () =>
    expect(dueForReminder({ date: "2026-11-19", startTime: 0.5, createdAt: "2026-11-01T00:00:00Z" }, at("2026-11-18T23:00:00+05:00"))).toBe(true));
});

describe("notification shape for the app", () => {
  it("matches the PDF fields", () => {
    expect(
      toAppNotification({
        _id: { toString: () => "n1" },
        type: "payment_verified",
        title: "Payment verified",
        body: "…",
        isRead: false,
        bookingId: { toString: () => "b1" },
        amount: 3575,
        createdAt: new Date("2026-11-02T11:00:00Z"),
      }),
    ).toEqual({
      id: "n1",
      type: "payment_verified",
      title: "Payment verified",
      body: "…",
      isRead: false,
      bookingId: "b1",
      amount: 3575,
      createdAt: "2026-11-02T16:00:00+05:00",
    });
  });
});

describe("safety switches", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it("push and email are off unless set to exactly 'true'", () => {
    delete process.env.NOTIFY_SEND_PUSH;
    process.env.NOTIFY_SEND_EMAIL = "1";
    expect(sendSwitches()).toEqual({ push: false, email: false });
    process.env.NOTIFY_SEND_PUSH = "true";
    expect(sendSwitches().push).toBe(true);
  });
  it("Firebase key: JSON or base64, else nothing", () => {
    const sa = { project_id: "p", client_email: "e@x", private_key: "k" };
    expect(readServiceAccount(JSON.stringify(sa))).toEqual(sa);
    expect(readServiceAccount(Buffer.from(JSON.stringify(sa)).toString("base64"))).toEqual(sa);
    expect(readServiceAccount("")).toBeNull();
    expect(readServiceAccount("nonsense")).toBeNull();
  });
});

describe("message time", () => {
  it("shows Pakistan time", () => expect(startLabel(at("2026-11-18T18:00:00+05:00"))).toMatch(/Wed 18 Nov.*6:00\s?pm/i));
});
