"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nowIST } from "@/lib/dates";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [year, month] = value
    ? [parseInt(value.slice(0, 4)), parseInt(value.slice(5, 7))]
    : [nowIST().getFullYear(), nowIST().getMonth() + 1];

  const [viewYear, setViewYear] = useState(year);

  useEffect(() => {
    setViewYear(year);
  }, [year]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const displayLabel = value
    ? `${MONTHS[month - 1]} ${year}`
    : "Select month";

  function select(m: number) {
    const val = `${viewYear}-${String(m).padStart(2, "0")}`;
    onChange(val);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 w-full"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 z-50 w-64 rounded-xl border bg-popover p-4 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{viewYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((name, i) => {
              const m = i + 1;
              const isSelected = viewYear === year && m === month;
              const isCurrent =
                viewYear === nowIST().getFullYear() &&
                m === nowIST().getMonth() + 1;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => select(m)}
                  className={`
                    rounded-lg px-2 py-2 text-sm font-medium transition-all
                    ${isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCurrent
                        ? "bg-muted text-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
