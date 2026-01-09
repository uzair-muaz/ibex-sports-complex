"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  minDate?: Date;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  minDate,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            "h-auto! w-full sm:w-64 justify-start text-left text-sm font-semibold bg-zinc-900/50! border border-white/10 text-white hover:bg-[#2DD4BF] hover:text-[#0F172A] hover:border-[#2DD4BF] pl-11 pr-4 py-3.5! rounded-xl focus:ring-2 focus:ring-[#2DD4BF]/50 relative transition-all duration-300",
            className
          )}
        >
          <CalendarIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
          <span className="pl-6 text-white">
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            // Disable if date is before today OR before minDate if provided
            if (checkDate < today) return true;
            if (minDate) {
              const min = new Date(minDate);
              min.setHours(0, 0, 0, 0);
              return checkDate < min;
            }
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
