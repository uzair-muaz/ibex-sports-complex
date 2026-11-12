import { describe, expect, it } from "vitest";
import { guestTokensFrom, MAX_GUEST_TOKENS, parseGuestTokens } from "@/lib/api/guest-bookings";
import { hashClientIp, newGuestAccessToken } from "@/lib/api/create-app-booking";

const good = () => newGuestAccessToken();

describe("guest codes from the phone", () => {
  it("keeps real codes, ignores junk and repeats", () => {
    const a = good();
    const b = good();
    expect(parseGuestTokens(` ${a}, junk ,${b},${a},, gt_short`)).toEqual([a, b]);
    expect(parseGuestTokens("")).toEqual([]);
  });

  it("caps how many codes are read", () => {
    const many = Array.from({ length: MAX_GUEST_TOKENS + 10 }, good).join(",");
    expect(parseGuestTokens(many)).toHaveLength(MAX_GUEST_TOKENS);
  });

  it("reads both headers", () => {
    const a = good();
    const b = good();
    const req = new Request("http://x/api", { headers: { "X-Guest-Tokens": a, "X-Guest-Token": b } });
    expect(guestTokensFrom(req)).toEqual([a, b]);
  });
});

describe("guest device limit", () => {
  it("scrambles the address; same address same value; none → null", () => {
    const r1 = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    const r2 = new Request("http://x", { headers: { "x-real-ip": "1.2.3.4" } });
    const r3 = new Request("http://x", { headers: { "x-real-ip": "5.6.7.8" } });
    expect(hashClientIp(r1)).toBe(hashClientIp(r2));
    expect(hashClientIp(r1)).not.toBe(hashClientIp(r3));
    expect(hashClientIp(r1)).not.toContain("1.2.3.4");
    expect(hashClientIp(new Request("http://x"))).toBeNull();
  });
});
