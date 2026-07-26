"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  items: SpaceWorkItem[];
  onUpdateItemDates?: (itemId: string, patch: { startDate?: string | null; dueDate?: string | null }) => void;
}

const MONTHS_SHOWN = 2;
const COL_WIDTH = 32; // px per day

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

type DragMode = "move" | "resize-start" | "resize-end";

interface ActiveDrag {
  itemId: string;
  mode: DragMode;
  startX: number;
  origStart: string;
  origEnd: string;
  /** live pixel offset (smooth, not snapped) */
  offsetPx: number;
}

export function TimelineView({ items, onUpdateItemDates }: TimelineViewProps) {
  const today = new Date();
  const [offsetMonths, setOffsetMonths] = useState(0);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);

  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth() + offsetMonths;

  const months = useMemo(() => {
    const result: { year: number; month: number; days: number }[] = [];
    for (let m = 0; m < MONTHS_SHOWN; m++) {
      const d = new Date(baseYear, baseMonth + m, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth(), days: daysInMonth(d.getFullYear(), d.getMonth()) });
    }
    return result;
  }, [baseYear, baseMonth]);

  const totalDays = months.reduce((s, m) => s + m.days, 0);
  const totalWidth = totalDays * COL_WIDTH;

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

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayCol = dayIndex[todayKey] ?? null;

  const HEADER_H = 48;
  const ROW_H = 40;
  const LABEL_W = 200;

  // ─── Global mouse events (attached to window so drag doesn't break) ──────────
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      setDrag((prev) => prev ? { ...prev, offsetPx: e.clientX - prev.startX } : null);
    };

    const onUp = () => {
      if (!drag) return;
      // Snap to day grid on release
      const deltaDays = Math.round(drag.offsetPx / COL_WIDTH);
      if (deltaDays !== 0 && onUpdateItemDates) {
        if (drag.mode === "move") {
          onUpdateItemDates(drag.itemId, {
            startDate: addDays(drag.origStart, deltaDays),
            dueDate: addDays(drag.origEnd, deltaDays),
          });
        } else if (drag.mode === "resize-end") {
          onUpdateItemDates(drag.itemId, { dueDate: addDays(drag.origEnd, deltaDays) });
        } else if (drag.mode === "resize-start") {
          onUpdateItemDates(drag.itemId, { startDate: addDays(drag.origStart, deltaDays) });
        }
      }
      setDrag(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, onUpdateItemDates]);

  function startDrag(e: React.MouseEvent, item: SpaceWorkItem, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    const fallback = toISODate(today);
    setDrag({
      itemId: item.id,
      mode,
      startX: e.clientX,
      origStart: item.startDate ?? item.dueDate ?? fallback,
      origEnd: item.dueDate ?? item.startDate ?? fallback,
      offsetPx: 0,
    });
  }

  // ─── Render each bar ────────────────────────────────────────────────────────
  function resolveBarDates(item: SpaceWorkItem): { resolvedStart: string; resolvedEnd: string; pixelOffset: number; startOffset: number; endOffset: number } {
    const fallback = toISODate(today);
    const origStart = item.startDate ?? item.dueDate ?? fallback;
    const origEnd = item.dueDate ?? item.startDate ?? fallback;

    const isDraggingThis = drag?.itemId === item.id;
    const offsetPx = isDraggingThis ? drag!.offsetPx : 0;
    const deltaDays = Math.round(offsetPx / COL_WIDTH);

    // For tooltip & visual: smooth pixel offset for the bar, snapped dates for labels
    let resolvedStart = origStart;
    let resolvedEnd = origEnd;

    if (isDraggingThis && deltaDays !== 0) {
      if (drag!.mode === "move") {
        resolvedStart = addDays(drag!.origStart, deltaDays);
        resolvedEnd = addDays(drag!.origEnd, deltaDays);
      } else if (drag!.mode === "resize-end") {
        resolvedEnd = addDays(drag!.origEnd, deltaDays);
      } else if (drag!.mode === "resize-start") {
        resolvedStart = addDays(drag!.origStart, deltaDays);
      }
    }

    return {
      resolvedStart,
      resolvedEnd,
      pixelOffset: offsetPx,
      startOffset: drag?.mode === "move" || drag?.mode === "resize-start" ? offsetPx : 0,
      endOffset: drag?.mode === "move" || drag?.mode === "resize-end" ? offsetPx : 0,
    };
  }

  return (
    <div className={cn("flex h-full flex-col font-semibold select-none", drag && "cursor-grabbing")}>
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffsetMonths((o) => o - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[13px] font-semibold text-foreground min-w-[140px] text-center">
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
              <div key={item.id} className="flex items-center gap-1.5 border-b border-border-subtle px-3" style={{ height: ROW_H }}>
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
              <div className="flex" style={{ height: 22 }}>
                {months.map((m) => (
                  <div key={`${m.year}-${m.month}`} style={{ width: m.days * COL_WIDTH }} className="border-r border-border-subtle px-2 pt-1 text-[11px] font-semibold text-foreground">
                    {new Date(m.year, m.month).toLocaleDateString("en", { month: "short", year: "numeric" })}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: 26 }}>
                {months.flatMap((m) =>
                  Array.from({ length: m.days }, (_, i) => {
                    const isToday = today.getFullYear() === m.year && today.getMonth() === m.month && today.getDate() === i + 1;
                    return (
                      <div
                        key={`${m.year}-${m.month}-${i}`}
                        style={{ width: COL_WIDTH }}
                        className={cn("flex items-center justify-center border-r border-border-subtle text-[9.5px]", isToday ? "bg-accent text-white font-bold rounded-t" : "text-muted")}
                      >
                        {i + 1}
                      </div>
                    );
                  })
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
                    return <div key={`we-${m.year}-${m.month}-${i}`} className="absolute top-0 h-full bg-foreground/[0.05]" style={{ left: col * COL_WIDTH, width: COL_WIDTH }} />;
                  }
                  return null;
                })
              )}

              {/* Today line */}
              {todayCol !== null && (
                <div className="absolute top-0 h-full w-px bg-accent" style={{ left: (todayCol + 0.5) * COL_WIDTH }} />
              )}

              {/* Item bars */}
              {items.map((item, rowIdx) => {
                const cfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                const statusLabel = DEFAULT_COLUMNS.find((c) => c.id === item.status)?.label ?? item.status;
                const { resolvedStart, resolvedEnd, startOffset, endOffset } = resolveBarDates(item);

                const startCol = getColForDate(resolvedStart);
                const endCol = getColForDate(resolvedEnd);
                if (startCol === null && endCol === null) return null;

                // Pixel positions (smooth during drag)
                const baseLeft = (startCol ?? endCol ?? 0) * COL_WIDTH;
                const baseRight = ((endCol ?? startCol ?? 0) + 1) * COL_WIDTH;

                const isDraggingThis = drag?.itemId === item.id;

                // Smooth pixel offsets while dragging
                const smoothLeft = isDraggingThis
                  ? drag!.mode === "move"
                    ? baseLeft  // already resolved via deltaDays above
                    : drag!.mode === "resize-start"
                      ? baseLeft  // resolved above
                      : baseLeft
                  : baseLeft;

                const barWidth = Math.max(baseRight - baseLeft, COL_WIDTH * 2);
                const dayCount = daysBetween(resolvedStart, resolvedEnd);

                return (
                  <div
                    key={item.id}
                    className="absolute flex items-center"
                    style={{
                      top: rowIdx * ROW_H + 6,
                      left: smoothLeft,
                      height: ROW_H - 12,
                      width: barWidth,
                      zIndex: isDraggingThis ? 30 : 1,
                      willChange: isDraggingThis ? "transform" : undefined,
                    }}
                  >
                    {/* ── Jira-style date tooltip: left (start) ── */}
                    <AnimatePresence>
                      {isDraggingThis && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.92 }}
                          transition={{ duration: 0.12 }}
                          className="timeline-tooltip timeline-tooltip--left"
                        >
                          {formatDateLabel(resolvedStart)}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 h-full w-2.5 z-10 cursor-col-resize rounded-l-md"
                      onMouseDown={(e) => startDrag(e, item, "resize-start")}
                    >
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/50" />
                    </div>

                    {/* Main bar */}
                    <div
                      className={cn(
                        "flex h-full w-full items-center gap-1.5 rounded-md px-3 text-[11px] font-semibold text-white truncate",
                        isDraggingThis
                          ? "shadow-xl ring-2 ring-white/50 cursor-grabbing opacity-90"
                          : "shadow-sm hover:shadow-md cursor-grab",
                      )}
                      style={{ backgroundColor: cfg.color, transition: isDraggingThis ? "none" : "box-shadow 0.15s" }}
                      title={`${item.title} · ${statusLabel}`}
                      onMouseDown={(e) => startDrag(e, item, "move")}
                    >
                      <span className="truncate">{item.title}</span>
                    </div>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-2.5 z-10 cursor-col-resize rounded-r-md"
                      onMouseDown={(e) => startDrag(e, item, "resize-end")}
                    >
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/50" />
                    </div>

                    {/* ── Jira-style date tooltip: right (end + days) ── */}
                    <AnimatePresence>
                      {isDraggingThis && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.92 }}
                          transition={{ duration: 0.12 }}
                          className="timeline-tooltip timeline-tooltip--right"
                        >
                          {formatDateLabel(resolvedEnd)}&nbsp;
                          <span className="timeline-tooltip__days">({dayCount} {dayCount === 1 ? "day" : "days"})</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Row grid lines */}
              {items.map((_, i) => (
                <div key={`row-${i}`} className="absolute w-full border-b border-border-subtle" style={{ top: (i + 1) * ROW_H - 1 }} />
              ))}

              {/* Col grid lines */}
              {months.flatMap((m) =>
                Array.from({ length: m.days }, (_, i) => {
                  const col = dayIndex[`${m.year}-${m.month}-${i + 1}`] ?? 0;
                  return <div key={`col-${m.year}-${m.month}-${i}`} className="absolute top-0 h-full border-r border-border-subtle" style={{ left: (col + 1) * COL_WIDTH }} />;
                })
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
