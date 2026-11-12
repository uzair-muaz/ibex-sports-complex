import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { bookingOwnerFilter } from "@/lib/api/booking-access";
import { getAppBookingWhere } from "@/lib/api/my-bookings";
import { proofsByBooking, submitAppProof } from "@/lib/payments/proofs";

type Ctx = { params: Promise<{ id: string }> };

const notFound = (request: Request) =>
  apiError("Booking not found", 404, request, { code: "BOOKING_NOT_FOUND" });

/** List the transfer screenshots for my booking (signed in, or guest with X-Guest-Token). */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const access = await bookingOwnerFilter(request, id);
    if (!access) return notFound(request);
    const proofs = await proofsByBooking([id]);
    return apiOk({ proofs: proofs.get(id) ?? [] }, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET payment-proofs:", err);
    return apiError("Could not load payment proofs", 500, request, { code: "SERVER_ERROR" });
  }
}

/**
 * Send a transfer screenshot (multipart/form-data):
 * file (JPG/PNG/PDF, max 5 MB), amount, transferReference?, transferredAt?
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const access = await bookingOwnerFilter(request, id);
    if (!access) return notFound(request);

    const form = await request.formData().catch(() => null);
    if (!form) {
      return apiError("Send the screenshot as multipart/form-data.", 400, request, { code: "INVALID_FILE" });
    }
    const result = await submitAppProof({
      bookingId: id,
      userId: access.userId,
      file: form.get("file"),
      amount: form.get("amount"),
      transferReference: form.get("transferReference"),
      transferredAt: form.get("transferredAt"),
    });
    if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });

    const booking = await getAppBookingWhere(id, access.filter);
    return apiOk({ proof: result.proof, booking }, request, { status: 201 });
  } catch (err) {
    console.error("POST payment-proofs:", err);
    return apiError("Could not save the screenshot", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
