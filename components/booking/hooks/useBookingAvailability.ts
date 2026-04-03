import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAvailableStartTimes,
  type AvailableStartTimeQuote,
} from "@/app/actions/bookings";
import type { CourtType } from "@/types";

type UseBookingAvailabilityInput = {
  selectedCourtType: CourtType | null;
  dateString: string;
  selectedDurationHours: number;
  onBeforeLoad?: () => void;
};

export function useBookingAvailability({
  selectedCourtType,
  dateString,
  selectedDurationHours,
  onBeforeLoad,
}: UseBookingAvailabilityInput) {
  const onBeforeLoadRef = useRef(onBeforeLoad);
  useEffect(() => {
    onBeforeLoadRef.current = onBeforeLoad;
  }, [onBeforeLoad]);

  const [availableStartTimes, setAvailableStartTimes] = useState<
    AvailableStartTimeQuote[]
  >([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const refreshAvailability = useCallback(() => {
    setAvailabilityRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!selectedCourtType) return;
      setIsLoadingAvailability(true);
      setAvailabilityError("");
      onBeforeLoadRef.current?.();
      try {
        const result = await getAvailableStartTimes({
          courtType: selectedCourtType,
          date: dateString,
          duration: selectedDurationHours,
        });
        if (result.success) {
          setAvailableStartTimes(result.startTimes);
        } else {
          setAvailableStartTimes([]);
          setAvailabilityError(result.error);
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to load availability";
        setAvailableStartTimes([]);
        setAvailabilityError(message);
      } finally {
        setIsLoadingAvailability(false);
      }
    };
    run();
  }, [
    selectedCourtType,
    dateString,
    selectedDurationHours,
    availabilityRefreshKey,
  ]);

  return {
    availableStartTimes,
    isLoadingAvailability,
    availabilityError,
    refreshAvailability,
  };
}
