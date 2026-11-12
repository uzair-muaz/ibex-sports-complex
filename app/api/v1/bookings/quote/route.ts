import connectDB from "@/lib/mongodb";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { optionalApiUser } from "@/lib/api/guard";
import { isCustomerRole } from "@/lib/authz";
import { resolveSlot } from "@/lib/api/slot";
import { computeQuote } from "@/lib/pricing/quote";
import { slotStartIso } from "@/lib/api/availability";
import { walletBalance } from "@/lib/wallet";
import { checkHoursForSlot, loadMembershipForHours, type HoursCheck } from "@/lib/membership-hours";
import { checkPromo } from "@/lib/promo";

/**
 * Price check before booking. Guests and signed-in customers.
 * Body: { courtId, start, durationMinutes, useHours?, usePoints?, useWallet?, promoCode?, guestEmail? }
 * A promo code that can't be used doesn't fail the price check: the answer has
 * promo = null and promoError = { code, reasonCode, message }.
 * Hours, points and wallet are only for signed-in customers; guests get null for all three.
 * Nothing is saved or reserved.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    courtId?: unknown;
    start?: unknown;
    durationMinutes?: unknown;
    useHours?: unknown;
    usePoints?: unknown;
    useWallet?: unknown;
    promoCode?: unknown;
    guestEmail?: unknown;
  } | null;
  if (!body) {
    return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
  }

  try {
    const slot = await resolveSlot({
      courtId: body.courtId,
      start: body.start,
      durationMinutes: body.durationMinutes,
    });
    if (!slot.ok) return apiError(slot.error, slot.status, request, { code: slot.code });

    const user = await optionalApiUser(request);
    let customer: { pointsBalance: number; walletBalance: number } | null = null;
    let hours: HoursCheck | null = null;
    if (user && isCustomerRole(user.role)) {
      await connectDB();
      const [account, walletBal, membership] = await Promise.all([
        LoyaltyAccount.findOne({ userId: user.id }).select("balance").lean(),
        walletBalance(user.id),
        loadMembershipForHours(user.id),
      ]);
      customer = { pointsBalance: account?.balance ?? 0, walletBalance: walletBal };
      hours = checkHoursForSlot(membership, {
        sport: slot.court.type,
        dateKey: slot.dateKey,
        startHour: slot.startHour,
      });
    }

    let promo: { code: string; discount: number; description: string } | null = null;
    let promoError: { code: string; reasonCode: string; message: string } | null = null;
    if (typeof body.promoCode === "string" && body.promoCode.trim()) {
      const check = await checkPromo({
        code: body.promoCode,
        sport: slot.court.type,
        courtFee: slot.price,
        customer: customer
          ? { userId: user!.id, email: user!.email }
          : { email: typeof body.guestEmail === "string" ? body.guestEmail : null },
      });
      if (check.ok) promo = { code: check.code, discount: check.discount, description: check.description };
      else promoError = { code: check.code, reasonCode: check.reasonCode, message: check.message };
    }

    const quote = computeQuote({
      promo,
      originalCourtFee: slot.originalPrice,
      courtFee: slot.price,
      durationMinutes: slot.durationMinutes,
      customer,
      hours,
      useHours: body.useHours === true,
      usePoints: body.usePoints === true,
      useWallet: body.useWallet === true,
      loyalty: slot.settings.loyalty,
      minAdvancePercent: slot.settings.payments.minAdvancePercent,
    });

    return apiOk(
      {
        courtId: slot.court._id.toString(),
        courtName: slot.court.name,
        sport: slot.court.type,
        start: slotStartIso(slot.dateKey, slot.startHour),
        durationMinutes: slot.durationMinutes,
        rateType: slot.rateType,
        ...quote,
        promoError,
      },
      request,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("POST /api/v1/bookings/quote:", err);
    return apiError("Could not work out the price", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
