import { useEffect, useMemo, useState } from "react";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";

function getHourDecimalInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  return hour + minute / 60;
}

export function useBusinessTime(openingDate: Date) {
  const [nowTick, setNowTick] = useState<number>(0);

  useEffect(() => {
    setNowTick(Date.now());
    const interval = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const todayBusinessKey = useMemo(
    () => toDateKeyInTimezone(new Date(nowTick), BUSINESS_TIMEZONE),
    [nowTick],
  );
  const openingBusinessKey = useMemo(
    () => toDateKeyInTimezone(openingDate, BUSINESS_TIMEZONE),
    [openingDate],
  );
  const minSelectableDateKey = useMemo(
    () =>
      todayBusinessKey > openingBusinessKey
        ? todayBusinessKey
        : openingBusinessKey,
    [todayBusinessKey, openingBusinessKey],
  );
  const nowBusinessHourDecimal = useMemo(
    () => getHourDecimalInTimezone(new Date(nowTick), BUSINESS_TIMEZONE),
    [nowTick],
  );

  return {
    todayBusinessKey,
    openingBusinessKey,
    minSelectableDateKey,
    nowBusinessHourDecimal,
  };
}
