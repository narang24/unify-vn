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
  Link2,
  Maximize2,
  Minimize2,
  Pin,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { BoardCapsule } from "@/components/ui/board-capsule";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummaryView } from "@/components/views/summary-view";
import { ListView } from "@/components/views/list-view";
import { TimelineView } from "@/components/views/timeline-view";
import { CalendarView } from "@/components/views/calendar-view";
import { BoardView } from "@/components/board-view";
import { BacklogView } from "@/components/backlog-view";
import { AddMembersDialog } from "@/components/views/add-members-dialog";
import { ConnectRepoDialog } from "@/components/views/connect-repo-dialog";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { DEFAULT_COLUMNS, type BoardColumn, type BoardKind, type SpaceWorkItem } from "@/lib/work-item-types";
import type { ConnectedRepository } from "@/lib/repo-types";

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
  boardType: BoardKind;
  columns?: BoardColumn[];
  items: SpaceWorkItem[];
  pinned?: boolean;
  currentUser: { fullName?: string | null; email: string } | null;
  connectedRepo?: ConnectedRepository | null;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onMove: (itemId: string, toStatus: string) => void;
  onCreate: (status: string) => void;
  onCreateWithDate?: (dateISO: string) => void;
  onEditItem?: (item: SpaceWorkItem) => void;
  onAddColumn?: (label: string) => void;
  onConnectRepo?: (repo: ConnectedRepository) => void;
  onViewRepo?: (id: string) => void;
  onPinSpace?: () => void;
  onDeleteSpace?: () => void;
  onCreateBacklog: (target: "sprint" | "backlog") => void;
}

export function SpaceTopbar({
  spaceName,
  workspaceName,
  boardType,
  columns = DEFAULT_COLUMNS,
  items,
  pinned,
  currentUser,
  connectedRepo,
  fullscreen,
  onToggleFullscreen,
  onMove,
  onCreate,
  onCreateWithDate,
  onEditItem,
  onAddColumn,
  onConnectRepo,
  onViewRepo,
  onPinSpace,
  onDeleteSpace,
  onCreateBacklog,
}: SpaceTopbarProps) {
  const isScrum = boardType === "scrum";
  const [activeView, setActiveView] = useState<SpaceView>(isScrum ? "backlog" : "board");
  const [membersOpen, setMembersOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);

  const doneId = columns[columns.length - 1]?.id;
  const backlogItems = items.filter((i) => i.status === "todo");
  const sprintItems = items.filter((i) => i.status !== "todo");

  const memberNames = [currentUser?.fullName || currentUser?.email || "You"];

  function copyLink() {
    try {
      navigator.clipboard?.writeText(window.location.href);
      toast({ title: "Link copied", description: "Space link copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "error" });
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Space header ──────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-panel">
        {/* Row 1: space name + right actions */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-accent-foreground">
              {spaceName[0]?.toUpperCase() ?? "S"}
            </div>
            <h1 className="truncate text-[15px] font-semibold text-foreground">{spaceName}</h1>
            <BoardCapsule kind={boardType} className="shrink-0" />
            {workspaceName && <span className="hidden text-[12px] text-muted sm:inline">· {workspaceName}</span>}
          </div>

          {/* Right: action buttons */}
          <div className="ml-auto flex items-center gap-1.5">
            <AvatarCircles names={memberNames} size={24} className="mr-0.5" />

            <Button variant="outline" size="sm" className="hidden h-8 gap-1.5 text-[12px] sm:inline-flex" onClick={() => setMembersOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Members</span>
            </Button>

            {connectedRepo ? (
              <Button variant="outline" size="sm" className="hidden h-8 gap-1.5 text-[12px] sm:inline-flex" onClick={() => onViewRepo?.(connectedRepo.id)}>
                <Eye className="h-3.5 w-3.5" />
                <span>View Repo</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="hidden h-8 gap-1.5 text-[12px] sm:inline-flex" onClick={() => setRepoOpen(true)}>
                <GitBranch className="h-3.5 w-3.5" />
                <span>Connect Repo</span>
              </Button>
            )}

            {/* Mobile icon-only buttons */}
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setMembersOpen(true)} aria-label="Add members">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border-subtle" />

            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Copy link" onClick={copyLink}>
              <Link2 className="h-3.5 w-3.5 text-muted" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={fullscreen ? "Exit full screen" : "Full screen"} onClick={onToggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5 text-muted" /> : <Maximize2 className="h-3.5 w-3.5 text-muted" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-foreground/[0.06] hover:text-foreground" aria-label="More">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onPinSpace}>
                  <Pin className="h-3.5 w-3.5" /> {pinned ? "Unpin Space" : "Pin Space"}
                </DropdownMenuItem>
                <DropdownMenuItem destructive onClick={onDeleteSpace}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete Space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: view tabs */}
        <div className="relative flex items-center gap-2 px-4">
          <div className="flex items-end gap-0.5 overflow-x-auto scroll-thin no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-medium whitespace-nowrap transition-colors",
                    isActive ? "text-accent" : "text-muted hover:text-foreground",
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

          {fullscreen && (
            <Button variant="outline" size="sm" className="ml-auto h-7 gap-1.5 text-[12px]" onClick={onToggleFullscreen}>
              <Minimize2 className="h-3.5 w-3.5" /> Exit full screen
            </Button>
          )}
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
            {activeView === "summary" && <SummaryView items={items} spaceName={spaceName} />}
            {activeView === "list" && <ListView items={items} onStatusChange={onMove} />}
            {activeView === "board" && (
              <BoardView
                items={items}
                columns={columns}
                onMove={onMove}
                onCreate={onCreate}
                onEdit={onEditItem}
                onAddColumn={onAddColumn}
              />
            )}
            {activeView === "timeline" && <TimelineView items={items} />}
            {activeView === "calendar" && <CalendarView items={items} onCreateWithDate={onCreateWithDate} />}
            {activeView === "backlog" && (
              <BacklogView
                showSprint={isScrum}
                sprintName="Sprint 1"
                sprintItems={sprintItems}
                backlogItems={isScrum ? backlogItems : items}
                doneStatusId={doneId}
                onStartSprint={() => toast({ title: "Sprint started", variant: "success" })}
                onCreate={onCreateBacklog}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AddMembersDialog open={membersOpen} onClose={() => setMembersOpen(false)} spaceName={spaceName} />
      <ConnectRepoDialog
        open={repoOpen}
        onClose={() => setRepoOpen(false)}
        spaceName={spaceName}
        onConnected={(repo) => {
          onConnectRepo?.(repo);
          setRepoOpen(false);
        }}
      />
    </div>
  );
}
