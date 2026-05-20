"use client";

import * as React from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "./ui/utils";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useFeriados } from "../contexts/FeriadosContext";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  buttonClassName?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  className,
  placeholder = "Selecionar data",
  required,
  disabled,
  buttonClassName,
}: DatePickerProps) {
  const { feriados } = useFeriados();
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  const modifiers = React.useMemo(
    () => ({
      sunday: (date: Date) => date.getDay() === 0,
      holiday: (date: Date) => {
        if (!feriados || feriados.length === 0) return false;
        const dateStr = format(date, "yyyy-MM-dd");
        return feriados.some(f => f.data === dateStr);
      },
    }),
    [feriados],
  );

  const modifiersStyles = React.useMemo(
    () => ({
      sunday: {
        backgroundColor: "#fef2f2",
        color: "#991b1b",
        fontWeight: 600,
      },
      holiday: {
        backgroundColor: "#fef2f2",
        color: "#991b1b",
        fontWeight: 700,
      },
    }),
    [],
  );

  const handleSelect = (day: Date | undefined) => {
    if (day && onChange) {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const isWeekendOrHoliday =
    value &&
    (new Date(value + "T12:00:00").getDay() === 0 ||
      feriados?.some(f => f.data === value));

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
            className={cn(
              "w-full px-4 py-2.5 border rounded-lg text-left flex items-center gap-2 transition-colors",
              "focus:outline-none focus:border-[#0d6b5e] focus:ring-2 focus:ring-[#0d6b5e]/10",
              disabled && "opacity-50 cursor-not-allowed",
              !disabled && "cursor-pointer hover:border-[#0d6b5e]/40",
              isWeekendOrHoliday
                ? "border-red-300 bg-red-50"
                : "border-[#0d6b5e]/20 bg-[#f4f9f8]",
              value ? "text-[#0a1a17]" : "text-[#4d7068]/60",
              buttonClassName,
            )}
          >
            <CalendarIcon
              className={cn(
                "w-4 h-4 shrink-0",
                isWeekendOrHoliday ? "text-red-500" : "text-[#0d6b5e]",
              )}
            />
            <span className="flex-1 truncate">
              {value
                ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy")
                : placeholder}
            </span>
            {required && !value && (
              <span className="text-red-400 text-xs">*</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
            fromDate={min ? new Date(min + "T00:00:00") : undefined}
            toDate={max ? new Date(max + "T00:00:00") : undefined}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            locale={pt}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
