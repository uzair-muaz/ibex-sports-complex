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
  variant?: "default" | "admin";
}

export function DatePicker({
  date,
  onDateChange,
  minDate,
  className,
  variant = "default",
}: DatePickerProps) {
  const isAdmin = variant === "admin";
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            isAdmin
              ? "h-9 w-full justify-start text-left text-sm font-normal bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white hover:border-zinc-700 pl-10 pr-3 rounded-md focus:ring-2 focus:ring-[#2DD4BF]/50 relative transition-all"
              : "h-auto! w-full sm:w-64 justify-start text-left text-sm font-semibold bg-zinc-900/50! border border-white/10 text-white hover:bg-[#2DD4BF] hover:text-[#0F172A] hover:border-[#2DD4BF] pl-11 pr-4 py-3.5! rounded-xl focus:ring-2 focus:ring-[#2DD4BF]/50 relative transition-all duration-300",
            className
          )}
        >
          <CalendarIcon className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
            isAdmin
              ? "h-4 w-4 text-zinc-400"
              : "h-5 w-5 text-white"
          )} />
          <span className={cn(
            "text-sm",
            isAdmin ? "pl-6" : "pl-6 text-white"
          )}>
            {date ? format(date, "PPP") : <span className={isAdmin ? "text-zinc-500" : ""}>Pick a date</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(date) => {
            // Only disable if minDate is provided and date is before minDate
            if (minDate) {
              const min = new Date(minDate);
              min.setHours(0, 0, 0, 0);
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);
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
