import {
  createCourt,
  deleteCourt,
  getAllCourts,
  getCourts,
  updateCourt,
  type CreateCourtInput,
  type UpdateCourtInput,
} from "@/app/actions/courts";
import type { Court, CourtType } from "@/types";

export async function fetchAllCourts() {
  const result = await getAllCourts();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch courts");
  }
  return result.courts as Court[];
}

export async function fetchCourtsByType(type?: CourtType) {
  const result = await getCourts(type);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch courts");
  }
  return result.courts as Court[];
}

export async function requestCreateCourt(input: CreateCourtInput) {
  return createCourt(input);
}

export async function requestUpdateCourt(input: UpdateCourtInput) {
  return updateCourt(input);
}

export async function requestDeleteCourt(courtId: string) {
  return deleteCourt(courtId);
}
