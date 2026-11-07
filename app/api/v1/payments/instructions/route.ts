import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getAppSettings } from "@/lib/app-settings";

/** How to pay the advance by bank transfer. Edited in Admin → App Settings. */
export async function GET(request: Request) {
  try {
    const settings = await getAppSettings();
    return apiOk(
      {
        minAdvancePercent: settings.payments.minAdvancePercent,
        bankAccounts: settings.payments.bankAccounts,
        whatsAppNumber: settings.venue.whatsApp,
        acceptedFileTypes: ["jpg", "png", "pdf"],
        maxFileSizeMb: 5,
        transferNote: settings.payments.transferNote,
        verificationNote: settings.payments.verificationNote,
      },
      request,
    );
  } catch (err) {
    console.error("GET /api/v1/payments/instructions:", err);
    return apiError("Could not load payment details", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
