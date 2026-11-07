import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { getAppSettings } from "@/lib/app-settings";
import { listProofsForStaff } from "@/lib/payments/admin-proofs";
import { addWhatsAppProof } from "@/lib/payments/proofs";

/** Staff: payment screenshots. ?status=submitted (default) | verified | rejected */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const status = new URL(request.url).searchParams.get("status") || "submitted";
  if (status !== "submitted" && status !== "verified" && status !== "rejected") {
    return apiError("status must be submitted, verified or rejected", 400, request, { code: "VALIDATION_ERROR" });
  }
  const settings = await getAppSettings();
  const proofs = await listProofsForStaff({ status, minAdvancePercent: settings.payments.minAdvancePercent });
  return apiOk({ proofs }, request, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Staff: add a payment the customer sent on WhatsApp (saved as verified).
 * multipart/form-data: bookingReference, amount, file? (JPG/PNG/PDF), note?
 */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const form = await request.formData().catch(() => null);
  if (!form) return apiError("Send multipart/form-data.", 400, request, { code: "VALIDATION_ERROR" });
  const settings = await getAppSettings();
  const result = await addWhatsAppProof({
    bookingReference: form.get("bookingReference"),
    amount: form.get("amount"),
    file: form.get("file"),
    note: form.get("note"),
    staffId: gate.user.id,
    minAdvancePercent: settings.payments.minAdvancePercent,
  });
  if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
  return apiOk({ success: true, bookingId: result.bookingId }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
