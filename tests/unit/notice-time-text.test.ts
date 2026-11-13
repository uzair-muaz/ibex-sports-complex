import { describe, expect, it } from "vitest";
import { exampleCancelDeadline, minutesInWords } from "@/lib/notice-time-text";

describe("cancel notice in plain words", () => {
  it("turns minutes into hours and minutes", () => {
    expect(minutesInWords(300)).toBe("5 hours");
    expect(minutesInWords(240)).toBe("4 hours");
    expect(minutesInWords(90)).toBe("1 hour 30 minutes");
    expect(minutesInWords(60)).toBe("1 hour");
    expect(minutesInWords(45)).toBe("45 minutes");
    expect(minutesInWords(0)).toBe("0 minutes");
    expect(minutesInWords(1440)).toBe("1 day");
    expect(minutesInWords(1530)).toBe("1 day 1 hour 30 minutes");
    expect(minutesInWords(2880)).toBe("2 days");
  });

  it("gives an example deadline for an 8:00 PM booking", () => {
    expect(exampleCancelDeadline(300)).toBe("3:00 PM the same day");
    expect(exampleCancelDeadline(90)).toBe("6:30 PM the same day");
    expect(exampleCancelDeadline(1200)).toBe("12:00 AM the same day");
    expect(exampleCancelDeadline(1440)).toBe("8:00 PM the day before");
    expect(exampleCancelDeadline(2880)).toBe("8:00 PM, 2 days before");
  });
});
