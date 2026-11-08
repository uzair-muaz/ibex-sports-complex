import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { optionalApiUser } from "@/lib/api/guard";
import { isCustomerRole } from "@/lib/authz";
import { checkPromo } from "@/lib/promo";
import { isSportCode } from "@/lib/sport-rules";
import { hashClientIp } from "@/lib/api/create-app-booking";

// 20 checks per visitor per 10 minutes, so codes can't be guessed by trying many.
// Kept in this server's memory (enough for one server; a shared store would be needed on many).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS = 20;
const seen = new Map<string, number[]>();

function tooMany(key: string, now = Date.now()): boolean {
  const recent = (seen.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(key, recent);
  if (seen.size > 5000) for (const [k, v] of seen) if (v.every((t) => now - t >= WINDOW_MS)) seen.delete(k);
  return recent.length > MAX_CHECKS;
}

/**
 * Public: does this promo code work for this sport and court fee?
 * Body: { code, sport, courtFee, email? } (email: guests, to check their own uses).
 * Only a check; the booking checks again with the server's own price.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
  if (!isSportCode(body.sport)) {
    return apiError("sport must be a sport code, e.g. PADEL", 400, request, { code: "VALIDATION_ERROR" });
  }
  const courtFee = body.courtFee;
  if (typeof courtFee !== "number" || !Number.isFinite(courtFee) || courtFee < 0 || courtFee > 1_000_000) {
    return apiError("courtFee must be a PKR amount", 400, request, { code: "VALIDATION_ERROR" });
  }
  if (tooMany(hashClientIp(request) ?? "unknown")) {
    return apiError("Too many promo code tries. Please wait a few minutes.", 429, request, { code: "RATE_LIMITED" });
  }

  const user = await optionalApiUser(request);
  const signedIn = user && isCustomerRole(user.role);
  try {
    const result = await checkPromo({
      code: body.code,
      sport: body.sport as string,
      courtFee,
      customer: signedIn ? { userId: user.id, email: user.email } : { email: typeof body.email === "string" ? body.email : null },
    });
    return apiOk(
      result.ok
        ? { valid: true, code: result.code, discount: result.discount, description: result.description }
        : { valid: false, code: result.code, reasonCode: result.reasonCode, message: result.message },
      request,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("POST /api/v1/promo-codes/check:", err);
    return apiError("Could not check the promo code", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
