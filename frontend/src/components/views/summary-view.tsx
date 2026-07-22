"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, TrendingUp, Zap } from "lucide-react";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

interface SummaryViewProps {
  items: SpaceWorkItem[];
  spaceName: string;
}

export function SummaryView({ items, spaceName }: SummaryViewProps) {
  const total = items.length;

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const col of DEFAULT_COLUMNS) map[col.id] = 0;
    for (const item of items) {
      if (map[item.status] !== undefined) map[item.status]++;
      else map[item.status] = 1;
    }
    return map;
  }, [items]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.type] = (map[item.type] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const done = byStatus["done"] ?? 0;
  const inProgress = byStatus["inprogress"] ?? 0;
  const inReview = byStatus["inreview"] ?? 0;
  const todo = byStatus["todo"] ?? 0;
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  // SVG donut ring
  const R = 52;
  const C = 2 * Math.PI * R;
  const doneDash = (done / Math.max(total, 1)) * C;
  const inProgressDash = (inProgress / Math.max(total, 1)) * C;
  const inReviewDash = (inReview / Math.max(total, 1)) * C;
  const todoDash = (todo / Math.max(total, 1)) * C;

  const segments = [
    { dash: doneDash, color: "#1f9d6f", offset: 0 },
    { dash: inProgressDash, color: "#3a93b1", offset: doneDash },
    { dash: inReviewDash, color: "#f59e0b", offset: doneDash + inProgressDash },
    { dash: todoDash, color: "#e2e8f0", offset: doneDash + inProgressDash + inReviewDash },
  ];

  const statCards = [
    {
      label: "Total Issues",
      value: total,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Done",
      value: done,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: "Unstarted",
      value: todo,
      icon: Circle,
      color: "text-muted",
      bg: "bg-muted/10",
    },
  ];

  return (
    <div className="h-full overflow-y-auto scroll-thin p-5 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="rounded-xl border border-border-subtle bg-panel p-4"
            >
              <div className={cn("mb-2 inline-flex rounded-lg p-1.5", card.bg)}>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="mt-0.5 text-[12px] text-muted">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Donut progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          className="rounded-xl border border-border-subtle bg-panel p-5 flex flex-col items-center"
        >
          <p className="text-[13px] font-semibold text-foreground mb-4">Progress</p>
          <div className="relative">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={R} fill="none" strokeWidth="14" stroke="currentColor" className="text-border-subtle" />
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  strokeWidth="14"
                  stroke={seg.color}
                  strokeDasharray={`${seg.dash} ${C - seg.dash}`}
                  strokeDashoffset={-seg.offset + C / 4}
                  strokeLinecap="round"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{completionPct}%</span>
              <span className="text-[10px] text-muted">complete</span>
            </div>
          </div>
          <div className="mt-4 w-full space-y-1.5">
            {DEFAULT_COLUMNS.map((col) => (
              <div key={col.id} className="flex items-center justify-between text-[12px]">
                <span className="text-muted">{col.label}</span>
                <span className="font-medium text-foreground">{byStatus[col.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* By type */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="rounded-xl border border-border-subtle bg-panel p-5"
        >
          <p className="text-[13px] font-semibold text-foreground mb-4">By Type</p>
          {total === 0 ? (
            <p className="text-[12px] text-muted text-center mt-8">No items yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(WORK_ITEM_TYPES).map(([key, cfg]) => {
                const count = byType[key] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                const Icon = cfg.icon;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                        <span className="text-[12px] text-foreground">{cfg.label}</span>
                      </div>
                      <span className="text-[12px] font-medium text-muted">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Quick stats / metrics */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.25 }}
          className="rounded-xl border border-border-subtle bg-panel p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-semibold text-foreground">Space Metrics</p>
          </div>
          <div className="space-y-3">
            <MetricRow label="Space" value={spaceName} />
            <MetricRow label="Completion" value={`${completionPct}%`} />
            <MetricRow label="In Review" value={String(inReview)} />
            <MetricRow
              label="Velocity"
              value={done > 0 ? `${done} done` : "No data"}
            />
            <MetricRow
              label="Health"
              value={
                completionPct >= 75
                  ? "🟢 On track"
                  : completionPct >= 40
                  ? "🟡 At risk"
                  : "🔴 Behind"
              }
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="text-[12px] font-medium text-foreground truncate max-w-[120px]">{value}</span>
    </div>
  );
}
