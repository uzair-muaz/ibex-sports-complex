"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/query/keys";

export function useAllCourts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.courts.list(),
    queryFn: () => getAllCourts(),
    enabled: options?.enabled ?? true,
    select: (result) => (result.success ? (result.courts as Court[]) : []),
  });
}

export function useCourtsByType(
  type?: CourtType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.courts.byType(type),
    queryFn: () => getCourts(type),
    enabled: (options?.enabled ?? true) && !!type,
    select: (result) => (result.success ? (result.courts as Court[]) : []),
  });
}

function useInvalidateCourts() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
}

export function useCreateCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (input: CreateCourtInput) => createCourt(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (input: UpdateCourtInput) => updateCourt(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (courtId: string) => deleteCourt(courtId),
    onSuccess: () => invalidate(),
  });
}
