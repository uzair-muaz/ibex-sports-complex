import { describe, expect, it } from "vitest";
import { toPkIso } from "@/lib/api/time";
import {
  signInMethodFor,
  splitName,
  toLocalPakPhone,
  toMobileUser,
} from "@/lib/api/mobile-user";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenLifetimeDays,
} from "@/lib/api/refresh-tokens";
import { appleAudiences, nameFromAppleFullName } from "@/lib/api/apple";

describe("toPkIso", () => {
  it("formats UTC instants in Pakistan time with +05:00", () => {
    expect(toPkIso(new Date("2026-11-05T13:00:00Z"))).toBe("2026-11-05T18:00:00+05:00");
  });

  it("rolls over to the next day after 19:00 UTC", () => {
    expect(toPkIso("2026-11-05T20:30:00Z")).toBe("2026-11-06T01:30:00+05:00");
  });

  it("accepts epoch milliseconds", () => {
    expect(toPkIso(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01T05:00:00+05:00");
  });

  it("returns null for missing or invalid input", () => {
    expect(toPkIso(null)).toBeNull();
    expect(toPkIso(undefined)).toBeNull();
    expect(toPkIso("not a date")).toBeNull();
  });
});

describe("mobile user shape", () => {
  it("splits names into first and last", () => {
    expect(splitName("Hamza Ali Khan")).toEqual({ firstName: "Hamza", lastName: "Ali Khan" });
    expect(splitName("  Hamza  ")).toEqual({ firstName: "Hamza", lastName: "" });
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
  });

  it("shows phones as 03XXXXXXXXX", () => {
    expect(toLocalPakPhone("+923008521942")).toBe("03008521942");
    expect(toLocalPakPhone("03008521942")).toBe("03008521942");
    expect(toLocalPakPhone(null)).toBeNull();
  });

  it("picks the sign-in method", () => {
    expect(signInMethodFor({ password: "hash", googleId: "g" })).toBe("email");
    expect(signInMethodFor({ googleId: "g" })).toBe("google");
    expect(signInMethodFor({ appleId: "a" })).toBe("apple");
    expect(signInMethodFor({})).toBe("email");
  });

  it("builds the profile without leaking the password", () => {
    const user = toMobileUser({
      _id: { toString: () => "u_1" },
      email: "a@b.com",
      name: "Hamza Khan",
      role: "user",
      phone: "+923008521942",
      image: null,
      password: "$2a$12$secret",
      createdAt: new Date("2023-11-03T19:00:00Z"),
    });
    expect(user).toMatchObject({
      id: "u_1",
      firstName: "Hamza",
      lastName: "Khan",
      phone: "03008521942",
      imageUrl: null,
      memberSince: "2023-11-04T00:00:00+05:00",
      signInMethod: "email",
    });
    expect(JSON.stringify(user)).not.toContain("secret");
  });
});

describe("refresh tokens", () => {
  it("are long, random and prefixed", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.startsWith("r_")).toBe(true);
    expect(a.length).toBeGreaterThan(60);
    expect(a).not.toBe(b);
  });

  it("are stored as a fixed SHA-256 hash, never as-is", () => {
    const token = "r_example";
    const hash = hashRefreshToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashRefreshToken(token));
    expect(hash).not.toContain(token);
  });

  it("last 60 days unless configured", () => {
    const before = process.env.API_REFRESH_TOKEN_DAYS;
    delete process.env.API_REFRESH_TOKEN_DAYS;
    expect(refreshTokenLifetimeDays()).toBe(60);
    process.env.API_REFRESH_TOKEN_DAYS = "14";
    expect(refreshTokenLifetimeDays()).toBe(14);
    process.env.API_REFRESH_TOKEN_DAYS = "nonsense";
    expect(refreshTokenLifetimeDays()).toBe(60);
    if (before === undefined) delete process.env.API_REFRESH_TOKEN_DAYS;
    else process.env.API_REFRESH_TOKEN_DAYS = before;
  });
});

describe("apple helpers", () => {
  it("builds a name from Apple's fullName", () => {
    expect(nameFromAppleFullName({ givenName: "Sara", familyName: "Ali" })).toBe("Sara Ali");
    expect(nameFromAppleFullName({ givenName: "Sara" })).toBe("Sara");
    expect(nameFromAppleFullName({})).toBeNull();
    expect(nameFromAppleFullName(null)).toBeNull();
  });

  it("reads allowed audiences from env", () => {
    const b = process.env.APPLE_BUNDLE_ID;
    const s = process.env.APPLE_SERVICE_ID;
    process.env.APPLE_BUNDLE_ID = "com.ibex.app";
    delete process.env.APPLE_SERVICE_ID;
    expect(appleAudiences()).toEqual(["com.ibex.app"]);
    if (b === undefined) delete process.env.APPLE_BUNDLE_ID;
    else process.env.APPLE_BUNDLE_ID = b;
    if (s !== undefined) process.env.APPLE_SERVICE_ID = s;
  });
});
