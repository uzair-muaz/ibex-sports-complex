import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { listFaqs } from "@/lib/faqs";

/** Public: support FAQs for the app's Help screen and the website. */
export async function GET(request: Request) {
  try {
    return apiOk({ items: await listFaqs() }, request, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (err) {
    console.error("GET /api/v1/content/faqs:", err);
    return apiError("Could not load FAQs", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
