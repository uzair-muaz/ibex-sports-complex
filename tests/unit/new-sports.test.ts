import { describe, expect, it } from "vitest";
import { isSportCode, labelFromSportCode, priceUnitMinutesFor, sportCodeFromName, sportLabel } from "@/lib/sport-rules";
import { resolveAppSettings, validateSettingsPatch } from "@/lib/app-settings";
import { calculateOriginalPrice } from "@/lib/pricing-utils";
import { SPORT_NAMES } from "@/lib/promo-rules";

describe("sport codes", () => {
  it("makes a code from a name", () => {
    expect(sportCodeFromName("Table Tennis")).toBe("TABLE_TENNIS");
    expect(sportCodeFromName("  squash ")).toBe("SQUASH");
    expect(sportCodeFromName("3x3 Basketball")).toBe("X3_BASKETBALL");
    expect(sportCodeFromName("!!!")).toBeNull();
    expect(isSportCode("PADEL")).toBe(true);
    expect(isSportCode("padel")).toBe(false);
  });

  it("names a sport from the list, or from its code", () => {
    expect(labelFromSportCode("TABLE_TENNIS")).toBe("Table Tennis");
    expect(sportLabel("TT", [{ sport: "TT", label: "Ping Pong" }])).toBe("Ping Pong");
    expect(SPORT_NAMES.SQUASH).toBe("Squash");
    expect(SPORT_NAMES.PADEL).toBe("Padel");
  });
});

describe("added sports in App Settings", () => {
  it("keeps the built-in four and adds saved ones after them", () => {
    const s = resolveAppSettings({
      sports: [{ sport: "SQUASH", label: "Squash", showInApp: true, durationsMinutes: [60], defaultDurationMinutes: 60, sortOrder: 5 }],
    } as never).sports;
    expect(s.map((x) => x.sport)).toEqual(["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET", "SQUASH"]);
    expect(s[4]).toMatchObject({ label: "Squash", showInApp: true, durationsMinutes: [60], bookingWindowDays: 14 });
  });

  it("accepts a new sport code and refuses bad ones", () => {
    expect(validateSettingsPatch({ sports: [{ sport: "SQUASH", label: "Squash" }] }).ok).toBe(true);
    expect(validateSettingsPatch({ sports: [{ sport: "squash" }] }).ok).toBe(false);
    expect(validateSettingsPatch({ sports: [{ sport: "SQUASH", imageUrl: "" }] }).ok).toBe(true); // no photo yet
  });
});

describe("price per 60 or 90 minutes", () => {
  it("Futsal stays per 90 minutes unless the court says otherwise", () => {
    expect(priceUnitMinutesFor({ type: "FUTSAL" })).toBe(90);
    expect(priceUnitMinutesFor({ type: "SQUASH" })).toBe(60);
    expect(priceUnitMinutesFor({ type: "SQUASH", priceUnitMinutes: 90 })).toBe(90);
    expect(calculateOriginalPrice({ type: "FUTSAL", pricePerHour: 6000 }, 18, 1.5).originalPrice).toBe(6000);
    expect(calculateOriginalPrice({ type: "SQUASH", pricePerHour: 3000 }, 18, 1).originalPrice).toBe(3000);
    expect(calculateOriginalPrice({ type: "SQUASH", pricePerHour: 4500, priceUnitMinutes: 90 }, 18, 1.5).originalPrice).toBe(4500);
  });
});
