import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getCourts } from "@/app/actions/courts";

/** Public courts catalog for web + Flutter. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as
    | "PADEL"
    | "CRICKET"
    | "PICKLEBALL"
    | "FUTSAL"
    | null;

  const result = await getCourts(type || undefined);
  if (!result.success) {
    return apiError(result.error || "Failed to load courts", 400, request);
  }
  return apiOk({ courts: result.courts }, request, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}