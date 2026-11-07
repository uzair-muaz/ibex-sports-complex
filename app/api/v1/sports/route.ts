import connectDB from "@/lib/mongodb";
import Court from "@/models/Court";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getAppSettings } from "@/lib/app-settings";
import { mobileSports, type CourtSource } from "@/lib/api/catalog";
import { publicBaseUrl } from "@/lib/api/base-url";

/** Sports shown in the app, with their booking rules. Hidden sports (showInApp false) are left out. */
export async function GET(request: Request) {
  try {
    await connectDB();
    const [settings, courts] = await Promise.all([
      getAppSettings(),
      Court.find({ isActive: true }).lean(),
    ]);
    const sports = mobileSports(settings, courts as unknown as CourtSource[], await publicBaseUrl());
    return apiOk({ sports }, request, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/v1/sports:", err);
    return apiError("Could not load sports", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
