"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Plus, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORK_ITEM_TYPES, type SpaceWorkItem } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

export type BacklogWorkItem = SpaceWorkItem;

export function BacklogView({
  showSprint = true,
  sprintName,
  sprintItems,
  backlogItems,
  onStartSprint,
  onCreate,
}: {
  showSprint?: boolean;
  sprintName: string;
  sprintItems: BacklogWorkItem[];
  backlogItems: BacklogWorkItem[];
  doneStatusId?: string;
  onStartSprint: () => void;
  onCreate: (target: "sprint" | "backlog") => void;
}) {
  const [sprintOpen, setSprintOpen] = React.useState(true);
  const [backlogOpen, setBacklogOpen] = React.useState(true);

  return (
    <div className="h-full overflow-y-auto scroll-thin p-4">
      {showSprint && (
        <div className="mb-4">
          <BacklogSection
            title={sprintName}
            count={sprintItems.length}
            open={sprintOpen}
            onToggle={() => setSprintOpen((o) => !o)}
            headerAction={
              <Button size="sm" variant="secondary" onClick={onStartSprint} disabled={sprintItems.length === 0}>
                <PlayCircle className="h-3.5 w-3.5" /> Start sprint
              </Button>
            }
          >
            {sprintItems.length === 0 ? (
              <EmptyState
                title="Plan your sprint"
                description="Drag work items from the Backlog section or create new ones to plan the work for this sprint. Select Start sprint when you're ready."
              />
            ) : (
              <ItemList items={sprintItems} />
            )}
            <CreateRow onClick={() => onCreate("sprint")} />
          </BacklogSection>
        </div>
      )}

      <BacklogSection
        title="Backlog"
        count={backlogItems.length}
        open={backlogOpen}
        onToggle={() => setBacklogOpen((o) => !o)}
      >
        {backlogItems.length === 0 ? (
          <EmptyState title="Your backlog is empty." description="Create work items to start planning." compact />
        ) : (
          <ItemList items={backlogItems} />
        )}
        <CreateRow onClick={() => onCreate("backlog")} />
      </BacklogSection>
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
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12px] text-muted">{description}</p>
    </div>
  );
}
