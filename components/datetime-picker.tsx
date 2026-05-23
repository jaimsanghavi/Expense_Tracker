"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayIST, nowIST } from "@/lib/dates";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  id?: string;
}

export function DateTimePicker({ value, onChange, id }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const datePart = value?.slice(0, 10) ?? "";
  const timePart = value?.slice(11, 16) ?? "12:00";

  const selectedDate = datePart ? new Date(datePart + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (datePart) {
      const d = new Date(datePart + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [datePart]);

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; current: boolean; date: string }> = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        current: false,
        date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        current: true,
        date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    // Fill remaining to complete 6 rows
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: d,
        current: false,
        date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  function selectDate(dateStr: string) {
    onChange(`${dateStr}T${timePart}`);
  }

  function handleTimeChange(newTime: string) {
    onChange(`${datePart || todayIST()}T${newTime}`);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const today = todayIST();

  const displayText = datePart
    ? `${new Date(datePart + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at ${timePart}`
    : "Select date & time";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={datePart ? "text-foreground" : "text-muted-foreground"}>
          {displayText}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[300px] rounded-xl border bg-popover p-4 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-3">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((item, i) => {
              const isSelected = item.date === datePart;
              const isToday = item.date === today;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(item.date)}
                  className={`
                    h-8 w-full rounded-md text-xs font-medium transition-all
                    ${!item.current ? "text-muted-foreground/50" : ""}
                    ${isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                        ? "bg-muted text-foreground ring-1 ring-primary/40"
                        : item.current
                          ? "text-foreground hover:bg-muted"
                          : "hover:bg-muted/50"
                    }
                  `}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="mt-3 flex items-center gap-2 border-t pt-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <input
              type="time"
              value={timePart}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="flex-1 rounded-md border bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                const now = nowIST();
                const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                onChange(`${nowDate}T${nowTime}`);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
              }}
            >
              Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
