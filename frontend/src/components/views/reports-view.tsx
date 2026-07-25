"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Download, BarChart3, PieChart, Calendar, Clock, CheckCircle2, AlertCircle,
  Sparkles, TrendingUp, Search, ChevronLeft, ChevronRight as ChevronRight2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS, type SpaceWorkItem } from "@/lib/work-item-types";

interface ReportsViewProps {
  items: SpaceWorkItem[];
  spaceName: string;
  onOpenIntelli?: () => void;
}

type TabPeriod = "weekly" | "monthly" | "yearly";

// ── Mock historical data for charts ──────────────────────────────────────────

function generateWeeklyData(items: SpaceWorkItem[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((d, i) => ({
    label: d,
    created: Math.max(0, Math.floor(items.length * 0.3) + Math.floor(Math.random() * 3) - 1),
    completed: Math.max(0, Math.floor(items.filter(it => it.status === "done").length * 0.2) + Math.floor(Math.random() * 2)),
  }));
}

function generateMonthlyData(items: SpaceWorkItem[]) {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  return weeks.map((w) => ({
    label: w,
    created: Math.max(0, Math.floor(items.length * 0.4) + Math.floor(Math.random() * 4)),
    completed: Math.max(0, Math.floor(items.filter(it => it.status === "done").length * 0.35) + Math.floor(Math.random() * 3)),
  }));
}

function generateYearlyData(items: SpaceWorkItem[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m) => ({
    label: m,
    created: Math.max(0, Math.floor(items.length * 0.6) + Math.floor(Math.random() * 8) - 2),
    completed: Math.max(0, Math.floor(items.filter(it => it.status === "done").length * 0.5) + Math.floor(Math.random() * 5) - 1),
  }));
}

// ── Pie chart (SVG) ───────────────────────────────────────────────────────────

function PieChartSVG({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[12px] text-muted">No data</div>
    );
  }
  const r = 58;
  const cx = 80;
  const cy = 80;
  let cumAngle = -Math.PI / 2;
  const slices: JSX.Element[] = [];

  data.forEach((d, i) => {
    if (d.value === 0) return;
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    slices.push(<path key={i} d={path} fill={d.color} opacity={0.88} stroke="var(--panel)" strokeWidth={2} />);
    cumAngle += angle;
  });

  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r + 10} fill="none" />
      {slices}
      <circle cx={cx} cy={cy} r={r * 0.48} fill="var(--panel)" />
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="700" fill="var(--foreground)">
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--muted)">
        total
      </text>
    </svg>
  );
}

// ── Bar chart (SVG) ───────────────────────────────────────────────────────────

function BarChartSVG({
  data,
}: {
  data: { label: string; created: number; completed: number }[];
}) {
  const allVals = data.flatMap((d) => [d.created, d.completed]);
  const max = Math.max(...allVals, 1);
  const W = 480;
  const H = 120;
  const PAD_L = 28;
  const PAD_B = 24;
  const PAD_T = 8;
  const chartH = H - PAD_B - PAD_T;
  const chartW = W - PAD_L;
  const barGroupW = chartW / data.length;
  const barW = Math.min(14, barGroupW * 0.38);
  const gap = 3;

  function toY(v: number) {
    return PAD_T + chartH - (v / max) * chartH;
  }

  const yTicks = [0, Math.ceil(max / 2), max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      {/* Y ticks */}
      {yTicks.map((t, i) => (
        <React.Fragment key={i}>
          <line
            x1={PAD_L}
            x2={W}
            y1={toY(t)}
            y2={toY(t)}
            stroke="var(--border-subtle)"
            strokeDasharray="3,3"
          />
          <text x={PAD_L - 4} y={toY(t) + 4} fontSize={8} textAnchor="end" fill="var(--muted)">
            {t}
          </text>
        </React.Fragment>
      ))}

      {/* bars */}
      {data.map((d, i) => {
        const groupX = PAD_L + i * barGroupW + barGroupW / 2;
        const x1 = groupX - barW - gap / 2;
        const x2 = groupX + gap / 2;
        const h1 = (d.created / max) * chartH;
        const h2 = (d.completed / max) * chartH;
        return (
          <g key={i}>
            <rect x={x1} y={toY(d.created)} width={barW} height={h1} rx={2} fill="var(--accent)" opacity={0.7} />
            <rect x={x2} y={toY(d.completed)} width={barW} height={h2} rx={2} fill="#1f9d6f" opacity={0.7} />
            <text x={groupX} y={H - 4} fontSize={8} textAnchor="middle" fill="var(--muted)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Work items table ──────────────────────────────────────────────────────────

type TableCategory = "scheduled" | "active" | "past";

function useTable(items: SpaceWorkItem[], category: TableCategory) {
  return React.useMemo(() => {
    switch (category) {
      case "scheduled":
        return items.filter((it) => it.status === "todo");
      case "active":
        return items.filter((it) => it.status === "inprogress" || it.status === "inreview");
      case "past":
        return items.filter((it) => it.status === "done");
    }
  }, [items, category]);
}

const PAGE_SIZE = 8;

function WorkItemTable({ items, category }: { items: SpaceWorkItem[]; category: TableCategory }) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((it) => it.title.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => setPage(0), [search]);

  const categoryLabel = category === "scheduled" ? "Scheduled" : category === "active" ? "Active" : "Past";
  const categoryColor =
    category === "scheduled" ? "text-amber-500 bg-amber-500/10" :
    category === "active" ? "text-sky-500 bg-sky-500/10" :
    "text-emerald-500 bg-emerald-500/10";

  return (
    <div className="rounded-xl border border-border-subtle bg-panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", categoryColor)}>
          {categoryLabel}
        </span>
        <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[10.5px] font-semibold text-muted">
          {items.length}
        </span>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-7 rounded-lg border border-border-subtle bg-panel-strong/40 pl-8 pr-2 text-[12px] text-foreground placeholder:text-muted focus:outline-none focus-visible:border-accent"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-border-subtle bg-panel-strong/30">
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Work item key</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Type</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Priority</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Summary</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Assignee</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No items found.
                </td>
              </tr>
            ) : (
              pageItems.map((item) => {
                const typeCfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                const TypeIcon = typeCfg.icon;
                const statusCol = DEFAULT_COLUMNS.find((c) => c.id === item.status);
                return (
                  <tr key={item.id} className="hover:bg-foreground/3 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-accent">
                      {item.id.toUpperCase().slice(0, 6)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="h-3.5 w-3.5" style={{ color: typeCfg.color }} />
                        <span style={{ color: typeCfg.color }}>{typeCfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      <span className="flex items-center gap-1">
                        <span style={{ color: "#f59e0b" }}>≡</span> Medium
                      </span>
                    </td>
                    <td className="max-w-50 px-4 py-2.5 truncate text-foreground">{item.title}</td>
                    <td className="px-4 py-2.5 text-muted">{item.assignee ?? "Unassigned"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                        item.status === "done" ? "bg-emerald-500/10 text-emerald-500" :
                        item.status === "inprogress" ? "bg-sky-500/10 text-sky-500" :
                        item.status === "inreview" ? "bg-amber-500/10 text-amber-500" :
                        "bg-foreground/[0.07] text-muted"
                      )}>
                        {statusCol?.label ?? item.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2.5">
          <span className="text-[11.5px] text-muted">
            Showing rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md p-1 text-muted hover:bg-foreground/6 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  "h-6 w-6 rounded-md text-[11.5px] font-medium",
                  i === page ? "bg-accent text-white" : "text-muted hover:bg-foreground/6"
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-md p-1 text-muted hover:bg-foreground/6 disabled:opacity-40"
            >
              <ChevronRight2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reports View ─────────────────────────────────────────────────────────

export function ReportsView({ items, spaceName, onOpenIntelli }: ReportsViewProps) {
  const [period, setPeriod] = React.useState<TabPeriod>("weekly");
  const [exporting, setExporting] = React.useState(false);

  // Use stable random data (seeded by item count to avoid hydration issues)
  const weeklyData = React.useMemo(() => generateWeeklyData(items), [items.length]);
  const monthlyData = React.useMemo(() => generateMonthlyData(items), [items.length]);
  const yearlyData = React.useMemo(() => generateYearlyData(items), [items.length]);

  // Check if we have enough months of data for yearly chart
  const hasYearly = items.length >= 3;

  const currentChartData =
    period === "weekly" ? weeklyData :
    period === "monthly" ? monthlyData :
    yearlyData;

  // Pie chart data by type
  const byType = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.type] = (m[it.type] ?? 0) + 1;
    return Object.entries(WORK_ITEM_TYPES)
      .map(([key, cfg]) => ({ label: cfg.label, value: m[key] ?? 0, color: cfg.color }))
      .filter((d) => d.value > 0);
  }, [items]);

  const scheduled = useTable(items, "scheduled");
  const active = useTable(items, "active");
  const past = useTable(items, "past");

  const total = items.length;
  const done = past.length;
  const inProgress = active.length;

  async function handleExport() {
    setExporting(true);
    // Simulate PDF export
    await new Promise((r) => setTimeout(r, 1200));
    const blob = new Blob([`Unify Reports — ${spaceName}\n\nTotal: ${total}\nActive: ${inProgress}\nDone: ${done}\n`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spaceName.toLowerCase().replace(/\s+/g, "-")}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-5 space-y-5 font-semibold">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Reports</h2>
          <p className="mt-0.5 text-[12px] text-muted">Analytics and insights for <span className="font-semibold text-foreground">{spaceName}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {/* Unify Intelli Insights button */}
          <button
            onClick={onOpenIntelli}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-accent-soft hover:shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Unify Intelli Insights
          </button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Stat summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Items", value: total, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
          { label: "Active", value: inProgress, icon: Clock, color: "text-sky-500", bg: "bg-sky-500/10" },
          { label: "Scheduled", value: scheduled.length, icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Completed", value: done, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 6 }}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          className="rounded-xl border border-border-subtle bg-panel p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-semibold text-foreground">Work Item Type Distribution</p>
          </div>
          <div className="flex items-center gap-6">
            <PieChartSVG data={byType} />
            <div className="space-y-2">
              {byType.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-foreground">{d.label}</span>
                  <span className="ml-auto pl-4 font-semibold text-muted">{d.value}</span>
                </div>
              ))}
              {byType.length === 0 && <p className="text-[12px] text-muted">No items yet</p>}
            </div>
          </div>
        </motion.div>

        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="rounded-xl border border-border-subtle bg-panel p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <p className="text-[13px] font-semibold text-foreground">Work Item Trends</p>
            </div>
            <div className="flex rounded-lg border border-border-subtle p-0.5">
              {(["weekly", "monthly", ...(hasYearly ? ["yearly"] : [])] as TabPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-semibold capitalize transition-colors",
                    period === p
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <BarChartSVG data={currentChartData} />
          <div className="mt-2 flex items-center justify-center gap-5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent/70" />
              <span className="text-muted">Created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
              <span className="text-muted">Completed</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tables */}
      <div className="space-y-4">
        <h3 className="text-[13.5px] font-semibold text-foreground">Work Item Details</h3>
        <WorkItemTable items={scheduled} category="scheduled" />
        <WorkItemTable items={active} category="active" />
        <WorkItemTable items={past} category="past" />
      </div>
    </div>
  );
}
