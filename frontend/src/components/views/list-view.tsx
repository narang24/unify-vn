"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  User2,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS } from "@/lib/work-item-types";
import type { SpaceWorkItem } from "@/lib/work-item-types";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "title" | "type" | "status" | "dueDate";
type SortDir = "asc" | "desc";

interface ListViewProps {
  items: SpaceWorkItem[];
  onStatusChange: (itemId: string, status: string) => void;
}

export function ListView({ items, onStatusChange }: ListViewProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = items.filter((i) => {
      if (filterType && i.type !== filterType) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let av = a[sortKey] ?? "";
      let bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, search, sortKey, sortDir, filterType, filterStatus]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <SlidersHorizontal className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-accent" />
    ) : (
      <ChevronDown className="h-3 w-3 text-accent" />
    );
  };

  const activeFilters = [filterType, filterStatus].filter(Boolean).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[12.5px]"
          />
        </div>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted hover:bg-black/5 hover:text-foreground transition", filterType && "text-accent")}>
              <Filter className="h-3.5 w-3.5" />
              {filterType ? WORK_ITEM_TYPES[filterType as keyof typeof WORK_ITEM_TYPES]?.label : "Type"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterType(null)}>All types</DropdownMenuItem>
            {Object.values(WORK_ITEM_TYPES).map((t) => {
              const Icon = t.icon;
              return (
                <DropdownMenuItem key={t.value} onClick={() => setFilterType(t.value)}>
                  <Icon className="h-3.5 w-3.5" style={{ color: t.color }} />
                  {t.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted hover:bg-black/5 hover:text-foreground transition", filterStatus && "text-accent")}>
              <Filter className="h-3.5 w-3.5" />
              {filterStatus ? DEFAULT_COLUMNS.find((c) => c.id === filterStatus)?.label : "Status"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterStatus(null)}>All statuses</DropdownMenuItem>
            {DEFAULT_COLUMNS.map((col) => (
              <DropdownMenuItem key={col.id} onClick={() => setFilterStatus(col.id)}>
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[12px] text-muted"
            onClick={() => { setFilterType(null); setFilterStatus(null); }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-[12px] text-muted">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scroll-thin">
        <table className="w-full min-w-[640px] text-left">
          <thead className="sticky top-0 z-10 bg-panel border-b border-border-subtle">
            <tr>
              <Th label="Work" sortKey="title" current={sortKey} onSort={toggleSort}>
                <SortIcon k="title" />
              </Th>
              <Th label="Type" sortKey="type" current={sortKey} onSort={toggleSort}>
                <SortIcon k="type" />
              </Th>
              <th className="px-4 py-2.5 text-[11.5px] font-semibold text-muted">
                <div className="flex items-center gap-1"><User2 className="h-3 w-3" /> Assignee</div>
              </th>
              <Th label="Status" sortKey="status" current={sortKey} onSort={toggleSort}>
                <SortIcon k="status" />
              </Th>
              <Th label="Due Date" sortKey="dueDate" current={sortKey} onSort={toggleSort}>
                <SortIcon k="dueDate" />
              </Th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[13px] text-muted">
                    No items match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => {
                  const typeCfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                  const Icon = typeCfg.icon;
                  const statusLabel = DEFAULT_COLUMNS.find((c) => c.id === item.status)?.label ?? item.status;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      className="group border-b border-border-subtle last:border-0 hover:bg-panel-strong/30"
                    >
                      {/* Title */}
                      <td className="max-w-[260px] px-4 py-2.5">
                        <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2.5">
                        <Badge style={{ color: typeCfg.color, background: typeCfg.bg }} className="gap-1 whitespace-nowrap">
                          <Icon className="h-3 w-3" style={{ color: typeCfg.color }} />
                          {typeCfg.label}
                        </Badge>
                      </td>
                      {/* Assignee */}
                      <td className="px-4 py-2.5">
                        {item.assignee ? (
                          <Avatar name={item.assignee} size={22} />
                        ) : (
                          <span className="text-[12px] text-muted">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <button className="rounded-md px-2 py-0.5 text-[12px] font-medium transition hover:bg-border-subtle">
                              <StatusChip status={item.status} label={statusLabel} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {DEFAULT_COLUMNS.filter((c) => c.id !== item.status).map((col) => (
                              <DropdownMenuItem key={col.id} onClick={() => onStatusChange(item.id, col.id)}>
                                {col.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      {/* Due */}
                      <td className="px-4 py-2.5">
                        {item.dueDate ? (
                          <div className="flex items-center gap-1 text-[12px] text-muted">
                            <CalendarDays className="h-3 w-3" />
                            {item.dueDate}
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  current,
  onSort,
  children,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-2.5">
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 text-[11.5px] font-semibold text-muted hover:text-foreground transition",
          current === sortKey && "text-foreground",
        )}
      >
        {label}
        {children}
      </button>
    </th>
  );
}

function StatusChip({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    todo: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    inprogress: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    inreview: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    done: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-500",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", colors[status] ?? "bg-muted/20 text-muted")}>
      {label}
    </span>
  );
}
