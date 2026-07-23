"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  items: SpaceWorkItem[];
}

const MONTHS_SHOWN = 2; // how many months to display
const COL_WIDTH = 32; // px per day

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function TimelineView({ items }: TimelineViewProps) {
  const today = new Date();
  const [offsetMonths, setOffsetMonths] = useState(0);

  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth() + offsetMonths;

  // Build an array of all days across MONTHS_SHOWN months
  const months = useMemo(() => {
    const result: { year: number; month: number; days: number }[] = [];
    for (let m = 0; m < MONTHS_SHOWN; m++) {
      const d = new Date(baseYear, baseMonth + m, 1);
      result.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        days: daysInMonth(d.getFullYear(), d.getMonth()),
      });
    }
    return result;
  }, [baseYear, baseMonth]);

  const totalDays = months.reduce((s, m) => s + m.days, 0);
  const totalWidth = totalDays * COL_WIDTH;

  // Build day index lookup: "YYYY-M-D" -> columnIndex
  const dayIndex = useMemo(() => {
    const map: Record<string, number> = {};
    let idx = 0;
    for (const m of months) {
      for (let d = 1; d <= m.days; d++) {
        map[`${m.year}-${m.month}-${d}`] = idx++;
      }
    }
    return map;
  }, [months]);

  function getColForDate(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return dayIndex[key] ?? null;
  }

  // Today marker
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayCol = dayIndex[todayKey] ?? null;

  const HEADER_H = 48;
  const ROW_H = 40;
  const LABEL_W = 200;

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffsetMonths((o) => o - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[13px] font-medium text-foreground min-w-[140px] text-center">
          {new Date(baseYear, baseMonth).toLocaleDateString("en", { month: "long", year: "numeric" })}
          {MONTHS_SHOWN > 1 &&
            ` – ${new Date(baseYear, baseMonth + MONTHS_SHOWN - 1).toLocaleDateString("en", { month: "long", year: "numeric" })}`}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffsetMonths((o) => o + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-2 h-7 text-[12px]" onClick={() => setOffsetMonths(0)}>
          Today
        </Button>
      </div>

      {/* Gantt area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Frozen label column */}
        <div className="shrink-0 overflow-y-auto scroll-thin border-r border-border-subtle" style={{ width: LABEL_W }}>
          <div style={{ height: HEADER_H }} className="border-b border-border-subtle bg-panel px-3 flex items-end pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Item</span>
          </div>
          {items.map((item) => {
            const cfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-1.5 border-b border-border-subtle px-3"
                style={{ height: ROW_H }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />
                <span className="truncate text-[12px] text-foreground">{item.title}</span>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="flex items-center justify-center p-6">
              <span className="text-[12px] text-muted">No items</span>
            </div>
          )}
        </div>

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-auto scroll-thin">
          <div style={{ width: totalWidth + "px", minWidth: "100%" }}>
            {/* Month + day headers */}
            <div style={{ height: HEADER_H }} className="sticky top-0 z-10 border-b border-border-subtle bg-panel">
              {/* Month labels */}
              <div className="flex" style={{ height: 22 }}>
                {months.map((m) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    style={{ width: m.days * COL_WIDTH }}
                    className="border-r border-border-subtle px-2 pt-1 text-[11px] font-semibold text-foreground"
                  >
                    {new Date(m.year, m.month).toLocaleDateString("en", { month: "short", year: "numeric" })}
                  </div>
                ))}
              </div>
              {/* Day labels */}
              <div className="flex" style={{ height: 26 }}>
                {months.flatMap((m) =>
                  Array.from({ length: m.days }, (_, i) => {
                    const isToday =
                      today.getFullYear() === m.year &&
                      today.getMonth() === m.month &&
                      today.getDate() === i + 1;
                    return (
                      <div
                        key={`${m.year}-${m.month}-${i}`}
                        style={{ width: COL_WIDTH }}
                        className={cn(
                          "flex items-center justify-center border-r border-border-subtle text-[9.5px]",
                          isToday ? "bg-accent text-white font-bold rounded-t" : "text-muted",
                        )}
                      >
                        {i + 1}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Rows */}
            <div className="relative" style={{ height: Math.max(items.length * ROW_H, 360) }}>
              {/* Weekend shading */}
              {months.flatMap((m) =>
                Array.from({ length: m.days }, (_, i) => {
                  const dow = new Date(m.year, m.month, i + 1).getDay();
                  if (dow === 0 || dow === 6) {
                    const col = dayIndex[`${m.year}-${m.month}-${i + 1}`] ?? 0;
                    return (
                      <div
                        key={`weekend-${m.year}-${m.month}-${i}`}
                        className="absolute top-0 h-full bg-foreground/[0.05]"
                        style={{ left: col * COL_WIDTH, width: COL_WIDTH }}
                      />
                    );
                  }
                  return null;
                }),
              )}

              {/* Today line */}
              {todayCol !== null && (
                <div
                  className="absolute top-0 h-full w-px bg-accent"
                  style={{ left: (todayCol + 0.5) * COL_WIDTH }}
                />
              )}

              {/* Item bars */}
              {items.map((item, rowIdx) => {
                const cfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                const startCol = getColForDate(item.dueDate) ?? getColForDate(new Date().toISOString().split("T")[0]) ?? 0;
                const barWidth = Math.max(COL_WIDTH * 3, COL_WIDTH); // at least 3 days wide
                const statusLabel = DEFAULT_COLUMNS.find((c) => c.id === item.status)?.label ?? item.status;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: rowIdx * 0.04, duration: 0.25 }}
                    className="absolute flex items-center"
                    style={{
                      transformOrigin: "left",
                      top: rowIdx * ROW_H + 6,
                      left: startCol * COL_WIDTH,
                      height: ROW_H - 12,
                      width: barWidth,
                    }}
                  >
                    <div
                      className="flex h-full w-full items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-white shadow-sm truncate"
                      style={{ backgroundColor: cfg.color }}
                      title={`${item.title} · ${statusLabel}`}
                    >
                      <span className="truncate">{item.title}</span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Row grid lines */}
              {items.map((_, i) => (
                <div
                  key={`row-${i}`}
                  className="absolute w-full border-b border-border-subtle"
                  style={{ top: (i + 1) * ROW_H - 1 }}
                />
              ))}

              {/* Col grid lines */}
              {months.flatMap((m) =>
                Array.from({ length: m.days }, (_, i) => {
                  const col = dayIndex[`${m.year}-${m.month}-${i + 1}`] ?? 0;
                  return (
                    <div
                      key={`col-${m.year}-${m.month}-${i}`}
                      className="absolute top-0 h-full border-r border-border-subtle"
                      style={{ left: (col + 1) * COL_WIDTH }}
                    />
                  );
                }),
              )}
            </div>

            {/* Empty state */}
            {items.length === 0 && (
              <div className="flex h-40 items-center justify-center">
                <div className="text-center">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted" />
                  <p className="text-[13px] text-muted">No items to display on the timeline.</p>
                  <p className="mt-1 text-[11.5px] text-muted/70">Add items with due dates to see them here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
