import mongoose from "mongoose";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { membershipHoursHistory } from "@/lib/membership-admin";

/** Staff: a customer's memberships and hours history. ?userId= */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const userId = new URL(request.url).searchParams.get("userId") || "";
  if (!mongoose.isValidObjectId(userId)) {
    return apiError("Customer not found", 404, request, { code: "USER_NOT_FOUND" });
  }
  try {
    return apiOk(await membershipHoursHistory(userId), request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/admin/memberships:", err);
    return apiError("Could not load memberships", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
