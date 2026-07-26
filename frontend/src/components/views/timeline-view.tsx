"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Layers, GripVertical } from "lucide-react";
import { WORK_ITEM_TYPES } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  items: SpaceWorkItem[];
  onUpdateItemDates?: (itemId: string, patch: { startDate?: string | null; dueDate?: string | null }) => void;
}

const DAY_W = 36;
const ROW_H = 44;
const LABEL_W = 240;
const WINDOW_DAYS = 42; // ~6 weeks visible at a time
const MIN_BAR_DAYS = 1;
const OPEN_ENDED_DAYS = 10; // default visual length for items with no due date yet

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function daysBetween(a: Date, b: Date) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / MS);
}
function fmt(d: Date) {
  return d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

interface DragState {
  itemId: string;
  mode: "move" | "resize-start" | "resize-end";
  startClientX: number;
  origStartDate: Date;
  origDueDate: Date | null; // null = open-ended at drag start
}

export function TimelineView({ items, onUpdateItemDates }: TimelineViewProps) {
  const today = new Date();
  const [viewStart, setViewStart] = React.useState(() => addDays(today, -3));
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [liveDates, setLiveDates] = React.useState<Record<string, { start: Date; due: Date | null }>>({});
  const dragRef = React.useRef<DragState | null>(null);

  const totalWidth = WINDOW_DAYS * DAY_W;

  function goPrev() { setViewStart((d) => addDays(d, -14)); }
  function goNext() { setViewStart((d) => addDays(d, 14)); }
  function goToday() { setViewStart(addDays(today, -3)); }

  const days = React.useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(viewStart, i)),
    [viewStart],
  );

  // Month label groups for the header (spans of days within the same month)
  const monthGroups = React.useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    for (const d of days) {
      const label = d.toLocaleDateString("en", { month: "short", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.span += 1;
      else groups.push({ label, span: 1 });
    }
    return groups;
  }, [days]);

  function colForDate(d: Date) {
    return daysBetween(viewStart, d);
  }

  function getDates(item: SpaceWorkItem): { start: Date; due: Date | null } {
    const live = liveDates[item.id];
    if (live) return live;
    const due = item.dueDate ? new Date(item.dueDate) : null;
    const start = item.startDate
      ? new Date(item.startDate)
      : due
        ? addDays(due, -Math.max(MIN_BAR_DAYS, 2))
        : today;
    return { start, due };
  }

  function beginDrag(e: React.PointerEvent, item: SpaceWorkItem, mode: DragState["mode"]) {
    e.stopPropagation();
    e.preventDefault();
    const { start, due } = getDates(item);
    const state: DragState = { itemId: item.id, mode, startClientX: e.clientX, origStartDate: start, origDueDate: due };
    dragRef.current = state;
    setDrag(state);
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }

  function onDragMove(e: PointerEvent) {
    const state = dragRef.current;
    if (!state) return;
    const deltaDays = Math.round((e.clientX - state.startClientX) / DAY_W);
    let nextStart = state.origStartDate;
    let nextDue: Date | null = state.origDueDate;

    if (state.mode === "move") {
      nextStart = addDays(state.origStartDate, deltaDays);
      nextDue = state.origDueDate ? addDays(state.origDueDate, deltaDays) : null;
    } else if (state.mode === "resize-start") {
      const maxStart = state.origDueDate ? addDays(state.origDueDate, -MIN_BAR_DAYS) : addDays(today, 3650);
      let candidate = addDays(state.origStartDate, deltaDays);
      if (state.origDueDate && candidate > maxStart) candidate = maxStart;
      nextStart = candidate;
    } else if (state.mode === "resize-end") {
      const baseline = state.origDueDate ?? addDays(state.origStartDate, OPEN_ENDED_DAYS);
      const minDue = addDays(state.origStartDate, MIN_BAR_DAYS);
      let candidate = addDays(baseline, deltaDays);
      if (candidate < minDue) candidate = minDue;
      nextDue = candidate;
    }

    setLiveDates((prev) => ({ ...prev, [state.itemId]: { start: nextStart, due: nextDue } }));
  }

  function onDragEnd() {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    const state = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!state) return;
    const final = liveDates[state.itemId];
    if (final) {
      onUpdateItemDates?.(state.itemId, {
        startDate: toISODate(final.start),
        dueDate: final.due ? toISODate(final.due) : null,
      });
    }
  }

  React.useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayCol = colForDate(today);

  return (
    <div className="flex h-full flex-col overflow-hidden font-semibold">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[180px] text-center text-[13px] font-semibold text-foreground">
          {days[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – {days[days.length - 1].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="ml-2 h-7 text-[12px]" onClick={goToday}>
          Today
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Frozen label column */}
        <div className="shrink-0 overflow-y-auto scroll-thin border-r border-border-subtle" style={{ width: LABEL_W }}>
          <div className="flex items-end border-b border-border-subtle bg-panel px-3 pb-1.5" style={{ height: 56 }}>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Work</span>
          </div>
          {items.map((item) => {
            const cfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-center gap-1.5 border-b border-border-subtle px-3" style={{ height: ROW_H }}>
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} />
                <span className="truncate text-[12.5px] text-foreground">{item.title}</span>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="flex items-center justify-center p-6">
              <span className="text-[12px] text-muted">No work items</span>
            </div>
          )}
        </div>

        {/* Scrollable grid — everything below shares the same fixed totalWidth */}
        <div className="flex-1 overflow-auto scroll-thin">
          <div style={{ width: totalWidth }}>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border-subtle bg-panel" style={{ height: 56 }}>
              <div className="flex" style={{ height: 22 }}>
                {monthGroups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: g.span * DAY_W }}
                    className="truncate border-r border-border-subtle px-2 pt-1 text-[11px] font-semibold text-foreground"
                  >
                    {g.label}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: 26 }}>
                {days.map((d, i) => {
                  const isToday = i === todayCol;
                  return (
                    <div
                      key={i}
                      style={{ width: DAY_W }}
                      className={cn(
                        "flex items-center justify-center border-r border-border-subtle text-[9.5px]",
                        isToday ? "rounded-t bg-accent font-bold text-white" : "text-muted",
                      )}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            <div className="relative" style={{ height: Math.max(items.length * ROW_H, 240) }}>
              {/* Weekend shading — spans full grid height */}
              {days.map((d, i) => {
                const dow = d.getDay();
                if (dow !== 0 && dow !== 6) return null;
                return (
                  <div
                    key={`weekend-${i}`}
                    className="absolute top-0 h-full bg-foreground/[0.04]"
                    style={{ left: i * DAY_W, width: DAY_W }}
                  />
                );
              })}

              {/* Today line */}
              {todayCol >= 0 && todayCol < WINDOW_DAYS && (
                <div className="absolute top-0 h-full w-px bg-accent" style={{ left: (todayCol + 0.5) * DAY_W }} />
              )}

              {/* Vertical day gridlines — full height, full width, never stop early */}
              {days.map((_, i) => (
                <div key={`col-${i}`} className="absolute top-0 h-full border-r border-border-subtle" style={{ left: (i + 1) * DAY_W }} />
              ))}

              {/* Horizontal row lines — explicit width matches container, spans full grid */}
              {items.map((_, i) => (
                <div key={`row-${i}`} className="absolute border-b border-border-subtle" style={{ top: (i + 1) * ROW_H - 1, left: 0, width: totalWidth }} />
              ))}

              {/* Bars */}
              {items.map((item, rowIdx) => {
                const { start, due } = getDates(item);
                const isOpenEnded = !due;
                const effectiveDue = due ?? addDays(start, OPEN_ENDED_DAYS);
                const startCol = colForDate(start);
                const dueCol = colForDate(effectiveDue);
                const left = Math.max(startCol, -50) * DAY_W;
                const width = Math.max((dueCol - startCol + 1) * DAY_W, DAY_W);
                const isDragging = drag?.itemId === item.id;

                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger>
                      <div
                        className="absolute flex items-center"
                        style={{ top: rowIdx * ROW_H + 8, left, width, height: ROW_H - 16 }}
                      >
                        <div
                          onPointerDown={(e) => beginDrag(e, item, "move")}
                          className={cn(
                            "group relative flex h-full w-full cursor-grab items-center overflow-hidden rounded-md border transition-shadow active:cursor-grabbing",
                            "border-accent/40 bg-accent/20 hover:bg-accent/28",
                            isDragging && "shadow-[0_4px_14px_rgba(12,143,143,0.35)] ring-1 ring-accent",
                            isOpenEnded && "bg-gradient-to-r from-accent/24 via-accent/16 to-transparent border-r-0",
                          )}
                        >
                          {/* Left resize handle */}
                          <div
                            onPointerDown={(e) => beginDrag(e, item, "resize-start")}
                            className="absolute left-0 top-0 flex h-full w-2 shrink-0 cursor-ew-resize items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <GripVertical className="h-3 w-3 text-accent" />
                          </div>

                          <span className="truncate px-3 text-[11.5px] font-semibold text-accent">{item.title}</span>

                          {/* Right resize handle — always present; dragging it sets/updates the due date */}
                          <div
                            onPointerDown={(e) => beginDrag(e, item, "resize-end")}
                            className="absolute right-0 top-0 flex h-full w-2 shrink-0 cursor-ew-resize items-center justify-center opacity-0 group-hover:opacity-100"
                          >
                            <GripVertical className="h-3 w-3 text-accent" />
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {fmt(start)} → {isOpenEnded ? "Ongoing" : fmt(due!)}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className="flex h-40 items-center justify-center">
                <div className="text-center">
                  <Layers className="mx-auto mb-2 h-8 w-8 text-muted" />
                  <p className="text-[13px] text-muted">No work items on this board yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}