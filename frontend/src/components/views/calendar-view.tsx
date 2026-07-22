"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WORK_ITEM_TYPES } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface CalendarViewProps {
  items: SpaceWorkItem[];
}

export function CalendarView({ items }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  // Build calendar grid
  const { cells } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Prev month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrev - i) });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
    }
    // Next month fill
    const remainder = 42 - cells.length;
    for (let d = 1; d <= remainder; d++) {
      cells.push({ day: d, isCurrentMonth: false, date: new Date(year, month + 1, d) });
    }
    return { cells };
  }, [year, month]);

  // Map due-date items to date strings
  const itemsByDate = useMemo(() => {
    const map: Record<string, SpaceWorkItem[]> = {};
    for (const item of items) {
      if (!item.dueDate) continue;
      const key = item.dueDate.split("T")[0]; // "YYYY-MM-DD"
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[140px] text-center text-[13px] font-semibold text-foreground">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-2 h-7 text-[12px]" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scroll-thin p-3">
        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((cell, i) => {
              const key = dateKey(cell.date);
              const dayItems = itemsByDate[key] ?? [];
              const isTodayCell = isToday(cell.date);
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[80px] rounded-lg border p-1.5 transition-colors",
                    cell.isCurrentMonth
                      ? "border-border-subtle bg-panel hover:bg-panel-strong/20"
                      : "border-transparent bg-transparent",
                    isTodayCell && "ring-2 ring-accent border-accent",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-semibold",
                      isTodayCell
                        ? "bg-accent text-white"
                        : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted/40",
                    )}
                  >
                    {cell.day}
                  </div>

                  {dayItems.slice(0, 3).map((item) => {
                    const cfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                    return (
                      <div
                        key={item.id}
                        className="mb-0.5 truncate rounded px-1 py-0.5 text-[10.5px] font-medium text-white"
                        style={{ backgroundColor: cfg.color }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="px-1 text-[10px] text-muted">+{dayItems.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
