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
import type { SpaceWorkItem, Sprint } from "@/lib/work-item-types";
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
import { CreateSprintDialog, type SprintPayload } from "@/components/create-sprint-dialog";
import { SprintCompleteDialog } from "@/components/sprint-complete-dialog";
import { Plus, MoreHorizontal } from "lucide-react";

type SortKey = "title" | "type" | "status" | "dueDate";
type SortDir = "asc" | "desc";

interface ListViewProps {
  items: SpaceWorkItem[];
  onStatusChange: (itemId: string, status: string) => void;
  isScrum?: boolean;
  sprints?: Sprint[];
  onCreateSprint?: (payload: SprintPayload) => void;
  onEditSprint?: (id: string, payload: Partial<Sprint>) => void;
  onDeleteSprint?: (id: string) => void;
  onStartSprint?: (id: string) => void;
  onCompleteSprint?: (id: string) => void;
}

export function ListView({
  items,
  onStatusChange,
  isScrum,
  sprints = [],
  onCreateSprint,
  onEditSprint,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
}: ListViewProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [completeSprintOpen, setCompleteSprintOpen] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

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

  const handleCompleteSprintClick = (sprint: Sprint) => {
    setSprintToComplete(sprint);
    setCompleteSprintOpen(true);
  };

  const handleCompleteSprintSubmit = (moveTo: "next_sprint" | "backlog") => {
    if (sprintToComplete && onCompleteSprint) {
      onCompleteSprint(sprintToComplete.id);
      // Logic for moving items goes here
    }
  };

  const renderTable = (tableItems: SpaceWorkItem[]) => {
    return (
      <div className="flex-1 overflow-auto bg-background">
        <table className="w-full text-left border-collapse min-w-200">
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
              {tableItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-muted">
                    No items found.
                  </td>
                </tr>
              ) : (
                tableItems.map((item, i) => {
                  const typeCfg = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
                  const Icon = typeCfg.icon;
                  const statusLabel = DEFAULT_COLUMNS.find((c) => c.id === item.status)?.label ?? item.status;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(i, 20) * 0.02, duration: 0.15 }}
                      className="group border-b border-border-subtle last:border-0 hover:bg-panel-strong/30"
                    >
                      {/* Title */}
                      <td className="max-w-65 px-4 py-2.5">
                        <span className="truncate text-[13px] font-semibold text-foreground">{item.title}</span>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2.5">
                        <Badge style={{ color: typeCfg.color, background: typeCfg.bg }} className="gap-1 rounded-md whitespace-nowrap font-semibold">
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
                            <button className="rounded-md px-2 py-0.5 text-[12px] font-semibold transition hover:bg-border-subtle">
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
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden font-semibold">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5">
        <div className="flex items-center gap-2 flex-1">
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
              <button className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold text-muted hover:bg-foreground/6 hover:text-foreground transition", filterType && "text-accent")}>
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
              <button className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold text-muted hover:bg-foreground/6 hover:text-foreground transition", filterStatus && "text-accent")}>
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
        </div>

        {isScrum && (
          <Button variant="default" size="sm" onClick={() => setCreateSprintOpen(true)} className="h-8">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create Sprint
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {!isScrum ? (
          renderTable(filtered)
        ) : (
          <div className="p-4 space-y-6">
            {sprints.map((sprint) => {
              const sprintItems = filtered.filter((i) => i.sprintId === sprint.id);
              const isActive = sprint.status === "active";
              const isCompleted = sprint.status === "completed";
              return (
                <div key={sprint.id} className="bg-panel rounded-lg border border-border-subtle overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-panel-strong">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[14px] font-semibold">{sprint.name}</h3>
                      <span className="text-[12px] text-muted">{sprint.startDate} - {sprint.endDate}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {sprint.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCompleted && !isActive && (
                        <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => onStartSprint?.(sprint.id)}>
                          Start Sprint
                        </Button>
                      )}
                      {isActive && (
                        <Button variant="default" size="sm" className="h-7 text-[12px]" onClick={() => handleCompleteSprintClick(sprint)}>
                          Complete Sprint
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4 text-muted" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {}}>Edit Sprint</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteSprint?.(sprint.id)} className="text-danger">Delete Sprint</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {renderTable(sprintItems)}
                </div>
              );
            })}

            <div className="bg-panel rounded-lg border border-border-subtle overflow-hidden">
              <div className="p-3 border-b border-border-subtle bg-panel-strong">
                <h3 className="text-[14px] font-semibold">Backlog</h3>
              </div>
              {renderTable(filtered.filter((i) => !i.sprintId))}
            </div>
          </div>
        )}
      </div>

      {isScrum && onCreateSprint && (
        <CreateSprintDialog
          open={createSprintOpen}
          onOpenChange={setCreateSprintOpen}
          onSubmit={onCreateSprint}
          spaceName="Scrum Board"
          spaceId="current-space"
        />
      )}

      {isScrum && completeSprintOpen && sprintToComplete && (
        <SprintCompleteDialog
          open={completeSprintOpen}
          onOpenChange={setCompleteSprintOpen}
          openItemsCount={items.filter(i => i.sprintId === sprintToComplete.id && i.status !== "done").length}
          onComplete={handleCompleteSprintSubmit}
        />
      )}
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
    todo: "bg-[#E6D7B0]/55 text-black",
    inprogress: "bg-sky-300/55 text-black",
    inreview: "bg-[#D98657]/55 text-black",
    done: "bg-emerald-300/55 text-black",
  };
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide shadow-sm", colors[status] ?? "bg-muted/20 text-black")}>
      {label.toUpperCase()}
    </span>
  );
}
