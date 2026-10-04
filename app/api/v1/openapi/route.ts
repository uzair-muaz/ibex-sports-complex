import { getOpenApiDocument } from "@/lib/api/openapi";
import { apiOk, apiOptions } from "@/lib/api/response";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return apiOk(getOpenApiDocument(origin), request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
