"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Plus, PlayCircle, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateSprintDialog, type SprintPayload } from "@/components/create-sprint-dialog";
import { WORK_ITEM_TYPES, DEFAULT_COLUMNS, type SpaceWorkItem } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

export type BacklogWorkItem = SpaceWorkItem;

export function BacklogView({
  showSprint = true,
  sprintName,
  sprintItems,
  backlogItems,
  onStartSprint,
  onCreate,
  onCreateSprint,
}: {
  showSprint?: boolean;
  sprintName: string;
  sprintItems: BacklogWorkItem[];
  backlogItems: BacklogWorkItem[];
  doneStatusId?: string;
  onStartSprint: () => void;
  onCreate: (target: "sprint" | "backlog") => void;
  onCreateSprint?: (payload: SprintPayload) => void;
}) {
  const [sprintOpen, setSprintOpen] = React.useState(true);
  const [backlogOpen, setBacklogOpen] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [createSprintOpen, setCreateSprintOpen] = React.useState(false);

  const filteredSprintItems = React.useMemo(() => {
    let result = sprintItems;
    if (search.trim()) result = result.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (filterType) result = result.filter((i) => i.type === filterType);
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [sprintItems, search, filterType, filterStatus]);

  const filteredBacklogItems = React.useMemo(() => {
    let result = backlogItems;
    if (search.trim()) result = result.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
    if (filterType) result = result.filter((i) => i.type === filterType);
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    return result;
  }, [backlogItems, search, filterType, filterStatus]);

  const activeFilters = (search ? 1 : 0) + (filterType ? 1 : 0) + (filterStatus ? 1 : 0);

  return (
    <div className="flex h-full flex-col overflow-hidden font-semibold">
      {/* Toolbar (Only for Scrum) */}
      {showSprint && (
        <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-4 py-2.5 shrink-0">
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
                onClick={() => { setFilterType(null); setFilterStatus(null); setSearch(""); }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <Button variant="default" size="sm" onClick={() => setCreateSprintOpen(true)} className="h-8">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create Sprint
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        {showSprint && (
          <div className="mb-4">
            <BacklogSection
              title={sprintName}
              count={filteredSprintItems.length}
              open={sprintOpen}
              onToggle={() => setSprintOpen((o) => !o)}
              headerAction={
                <Button size="sm" variant="secondary" onClick={onStartSprint} disabled={filteredSprintItems.length === 0}>
                  <PlayCircle className="h-3.5 w-3.5" /> Start sprint
                </Button>
              }
            >
              {filteredSprintItems.length === 0 ? (
                <EmptyState
                  title="Plan your sprint"
                  description="Drag work items from the Backlog section or create new ones to plan the work for this sprint. Select Start sprint when you're ready."
                />
              ) : (
                <ItemList items={filteredSprintItems} />
              )}
              <CreateRow onClick={() => onCreate("sprint")} />
            </BacklogSection>
          </div>
        )}

        <BacklogSection
          title="Backlog"
          count={filteredBacklogItems.length}
          open={backlogOpen}
          onToggle={() => setBacklogOpen((o) => !o)}
        >
          {filteredBacklogItems.length === 0 ? (
            <EmptyState title="Your backlog is empty." description="Create work items to start planning." compact />
          ) : (
            <ItemList items={filteredBacklogItems} />
          )}
          <CreateRow onClick={() => onCreate("backlog")} />
        </BacklogSection>
      </div>

      <CreateSprintDialog
        open={createSprintOpen}
        onOpenChange={setCreateSprintOpen}
        onSubmit={(payload) => {
          onCreateSprint?.(payload);
          setCreateSprintOpen(false);
        }}
        spaceName="Scrum Board"
        spaceId="current-space"
      />
    </div>
  );
}

function BacklogSection({
  title,
  count,
  open,
  onToggle,
  headerAction,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-panel">
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
        <button onClick={onToggle} className="rounded-md p-0.5 hover:bg-foreground/[0.06]" aria-label="Toggle section">
          <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", !open && "-rotate-90")} />
        </button>
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <span className="text-[12px] text-muted">({count} work items)</span>
        <div className="ml-auto">{headerAction}</div>
      </div>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function ItemList({ items }: { items: BacklogWorkItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const typeConfig = WORK_ITEM_TYPES[item.type] ?? WORK_ITEM_TYPES.task;
        const Icon = typeConfig.icon;
        return (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 rounded-lg border border-border-subtle px-2.5 py-2 hover:bg-foreground/[0.04]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: typeConfig.color }} />
            <span className="truncate text-[13px] text-foreground">{item.title}</span>
            <Badge className="ml-auto" style={{ color: typeConfig.color, background: typeConfig.bg }}>
              {typeConfig.label}
            </Badge>
          </motion.div>
        );
      })}
    </div>
  );
}

function CreateRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-muted hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" /> Create
    </button>
  );
}

function EmptyState({
  title,
  description,
  compact,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border-subtle text-center", compact ? "py-6" : "py-10")}>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted">{description}</p>
    </div>
  );
}
