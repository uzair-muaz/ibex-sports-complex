import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
import {
  createCourt,
  deleteCourt,
  getAllCourts,
  getCourts,
  updateCourt,
  type CreateCourtInput,
  type UpdateCourtInput,
} from "@/app/actions/courts";
import type { CourtType } from "@/types";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as CourtType | null;

  if (type) {
    const result = await getCourts(type);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ courts: result.courts }, request);
  }

  const result = await getAllCourts(staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ courts: result.courts }, request);
}

export async function POST(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = (await request.json()) as CreateCourtInput;
  const result = await createCourt(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function PATCH(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = (await request.json()) as UpdateCourtInput;
  const result = await updateCourt(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function DELETE(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("courtId") || "";
  const result = await deleteCourt(courtId, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
