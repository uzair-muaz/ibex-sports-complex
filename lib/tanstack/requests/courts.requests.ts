import { bffFetch } from "@/lib/bff/client";
import type { CreateCourtInput, UpdateCourtInput } from "@/app/actions/courts";
import type { Court, CourtType } from "@/types";
import type { ActionResult } from "@/lib/tanstack/requests/bookings.requests";

export async function fetchAllCourts() {
  const data = await bffFetch<{ courts: Court[] }>("/api/v1/admin/courts");
  return data.courts;
}

/** Public catalog (no admin auth). */
export async function fetchPublicCourts(type?: CourtType) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await bffFetch<{ courts: Court[] }>(`/api/v1/courts${qs}`);
  return data.courts;
}

export async function fetchCourtsByType(type?: CourtType) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await bffFetch<{ courts: Court[] }>(
    `/api/v1/admin/courts${qs}`,
  );
  return data.courts;
}

export async function requestCreateCourt(input: CreateCourtInput) {
  return bffFetch<ActionResult<{ court?: Court }>>("/api/v1/admin/courts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestUpdateCourt(input: UpdateCourtInput) {
  return bffFetch<ActionResult<{ court?: Court }>>("/api/v1/admin/courts", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function requestDeleteCourt(courtId: string) {
  return bffFetch<ActionResult>(
    `/api/v1/admin/courts?courtId=${encodeURIComponent(courtId)}`,
    { method: "DELETE" },
  );
}
