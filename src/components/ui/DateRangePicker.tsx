// src/components/ui/DateRangePicker.tsx
"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import "react-day-picker/dist/style.css";

interface Props {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  unavailableDates?: Date[];
  locale?: string;
  minDate?: Date;
}

export function DateRangePicker({
  selected,
  onSelect,
  unavailableDates = [],
  locale = "en",
  minDate,
}: Props) {
  const isAr = locale === "ar";

  return (
    <div className="rdp-wrapper">
      <style>{`
        .rdp-wrapper .rdp {
          margin: 0 auto;
          --rdp-accent-color: #0369a1;
          --rdp-background-color: #e0f2fe;
        }
        .rdp-wrapper .rdp-day_selected:not(.rdp-day_disabled) {
          background-color: var(--rdp-accent-color) !important;
          color: white !important;
        }
        .rdp-wrapper .rdp-day_range_middle:not(.rdp-day_disabled) {
          background-color: var(--rdp-background-color) !important;
          color: #0369a1 !important;
        }
        .rdp-wrapper .rdp-day_range_end:not(.rdp-day_disabled),
        .rdp-wrapper .rdp-day_range_start:not(.rdp-day_disabled) {
          background-color: var(--rdp-accent-color) !important;
          color: white !important;
        }
        .rdp-wrapper .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
          background-color: #f0f9ff;
          border-radius: 0.5rem;
        }
        .rdp-wrapper .rdp-day_disabled {
          opacity: 0.3;
          text-decoration: line-through;
        }
        /* Flip navigation arrows for RTL (Arabic) */
        .rdp-wrapper [dir="rtl"] .rdp-nav_button {
          transform: scaleX(-1);
        }
      `}</style>

      <DayPicker
        mode="range"
        selected={selected}
        onSelect={onSelect}
        disabled={[{ before: minDate ?? new Date() }, ...unavailableDates]}
        numberOfMonths={1}
        showOutsideDays={false}
        dir={isAr ? "rtl" : "ltr"}
      />

      {selected?.from && selected?.to && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            {isAr ? "من: " : "From: "}
            <strong>{format(selected.from, "MMM d, yyyy")}</strong>
          </span>
          <span>
            {isAr ? "إلى: " : "To: "}
            <strong>{format(selected.to, "MMM d, yyyy")}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
