"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  List,
  Kanban,
  GanttChartSquare,
  CalendarDays,
  BookOpen,
  UserPlus,
  GitBranch,
  MoreHorizontal,
  Share2,
  Zap,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryView } from "@/components/views/summary-view";
import { ListView } from "@/components/views/list-view";
import { TimelineView } from "@/components/views/timeline-view";
import { CalendarView } from "@/components/views/calendar-view";
import { BoardView, type BoardWorkItem } from "@/components/board-view";
import { BacklogView, type BacklogWorkItem } from "@/components/backlog-view";
import { AddMembersDialog } from "@/components/views/add-members-dialog";
import { ConnectRepoDialog } from "@/components/views/connect-repo-dialog";
import { cn } from "@/lib/utils";
import type { SpaceWorkItem } from "@/lib/work-item-types";

// SpaceWorkItem is imported from work-item-types

export type SpaceView = "summary" | "list" | "board" | "timeline" | "calendar" | "backlog";

const TABS: { id: SpaceView; label: string; icon: typeof Kanban }[] = [
  { id: "summary",  label: "Summary",  icon: BarChart2 },
  { id: "list",     label: "List",     icon: List },
  { id: "board",    label: "Board",    icon: Kanban },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "backlog",  label: "Backlog",  icon: BookOpen },
];

interface SpaceTopbarProps {
  spaceName: string;
  workspaceName?: string;
  items: SpaceWorkItem[];
  onMove: (itemId: string, toStatus: string) => void;
  onCreate: (status: string) => void;
  onCreateBacklog: (target: "sprint" | "backlog") => void;
}

export function SpaceTopbar({
  spaceName,
  workspaceName,
  items,
  onMove,
  onCreate,
  onCreateBacklog,
}: SpaceTopbarProps) {
  const [activeView, setActiveView] = useState<SpaceView>("board");
  const [membersOpen, setMembersOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);

  const sprintItems: BacklogWorkItem[] = items.filter((i) => i.status !== "todo");
  const backlogItems: BacklogWorkItem[] = items.filter((i) => i.status === "todo");

  return (
    <div className="flex h-full flex-col">
      {/* ── Space header ──────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-panel">
        {/* Row 1: space name + right actions */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          {/* Space icon + name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
              {spaceName[0]?.toUpperCase() ?? "S"}
            </div>
            <h1 className="text-[15px] font-semibold text-foreground truncate">{spaceName}</h1>
            {workspaceName && (
              <span className="hidden text-[12px] text-muted sm:inline">· {workspaceName}</span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px] text-muted hidden sm:inline-flex" onClick={() => setMembersOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Members</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px] text-muted hidden sm:inline-flex" onClick={() => setRepoOpen(true)}>
              <GitBranch className="h-3.5 w-3.5" />
              <span>Connect Repo</span>
            </Button>

            {/* Mobile icon-only buttons */}
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" onClick={() => setMembersOpen(true)} aria-label="Add members">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" onClick={() => setRepoOpen(true)} aria-label="Connect repo">
              <GitBranch className="h-3.5 w-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border-subtle" />

            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Share">
              <Share2 className="h-3.5 w-3.5 text-muted" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Automations">
              <Zap className="h-3.5 w-3.5 text-muted" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hidden sm:inline-flex" aria-label="Fullscreen">
              <Maximize2 className="h-3.5 w-3.5 text-muted" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted" />
            </Button>
          </div>
        </div>

        {/* Row 2: view tabs */}
        <div className="relative flex items-end overflow-x-auto scroll-thin px-4 gap-0.5 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="space-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View content ──────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeView === "summary" && (
              <SummaryView items={items} spaceName={spaceName} />
            )}
            {activeView === "list" && (
              <ListView items={items} onStatusChange={onMove} />
            )}
            {activeView === "board" && (
              <BoardView
                items={items as BoardWorkItem[]}
                onMove={onMove}
                onCreate={onCreate}
              />
            )}
            {activeView === "timeline" && (
              <TimelineView items={items} />
            )}
            {activeView === "calendar" && (
              <CalendarView items={items} />
            )}
            {activeView === "backlog" && (
              <BacklogView
                sprintName="Sprint 1"
                sprintItems={sprintItems}
                backlogItems={backlogItems}
                onStartSprint={() => {}}
                onCreate={onCreateBacklog}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AddMembersDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        spaceName={spaceName}
      />
      <ConnectRepoDialog
        open={repoOpen}
        onClose={() => setRepoOpen(false)}
        spaceName={spaceName}
      />
    </div>
  );
}
