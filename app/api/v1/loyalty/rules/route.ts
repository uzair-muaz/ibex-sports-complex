import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getAppSettings } from "@/lib/app-settings";
import { loyaltyRulesView } from "@/lib/api/loyalty-view";

/** Public: points rules from Admin → App Settings, for guests in the app. */
export async function GET(request: Request) {
  try {
    const { loyalty } = await getAppSettings();
    return apiOk(loyaltyRulesView(loyalty), request, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (err) {
    console.error("GET /api/v1/loyalty/rules:", err);
    return apiError("Could not load points rules", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
