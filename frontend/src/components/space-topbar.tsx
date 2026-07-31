"use client";

import { useState, useCallback, useEffect } from "react";
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
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { BoardCapsule } from "@/components/ui/board-capsule";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
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
import { ReportsView } from "@/components/views/reports-view";
import { BoardView } from "@/components/board-view";
import { BacklogView } from "@/components/backlog-view";
import { AddMembersDialog } from "@/components/views/add-members-dialog";
import { ConnectRepoDialog } from "@/components/views/connect-repo-dialog";
import { EditWorkItemDialog, type WorkItemPayload } from "@/components/edit-work-item-dialog";
import { BoardIntelliSidebar } from "@/components/board-intelli-sidebar";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { DEFAULT_COLUMNS, type BoardColumn, type BoardKind, type SpaceWorkItem, type Sprint } from "@/lib/work-item-types";
import { appEnv } from "@/config/env";
import type { ConnectedRepository } from "@/lib/repo-types";

export type SpaceView = "summary" | "list" | "board" | "timeline" | "calendar" | "backlog" | "reports";

const TABS: { id: SpaceView; label: string; icon: typeof Kanban }[] = [
  { id: "summary", label: "Summary", icon: BarChart2 },
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: Kanban },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "backlog", label: "Backlog", icon: BookOpen },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

interface SpaceTopbarProps {
  spaceId: string;
  spaceName: string;
  workspaceName?: string;
  boardType: BoardKind;
  columns?: BoardColumn[];
  items: SpaceWorkItem[];
  sprints?: import("@/lib/work-item-types").Sprint[];
  pinned?: boolean;
  currentUser: { fullName?: string | null; email: string } | null;
  connectedRepo?: ConnectedRepository | null;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onMove: (itemId: string, toStatus: string) => void;
  onCreate: (status: string) => void;
  onCreateWithDate?: (dateISO: string) => void;
  onUpdateItemDates?: (itemId: string, patch: { startDate?: string | null; dueDate?: string | null }) => void;
  onEditItem?: (item: SpaceWorkItem, payload: WorkItemPayload) => void;
  onDeleteItem?: (id: string) => void;
  onAddColumn?: (label: string) => void;
  onConnectRepo?: (repo: ConnectedRepository) => void;
  onViewRepo?: (id: string) => void;
  onPinSpace?: () => void;
  onDeleteSpace?: () => void;
  onCreateBacklog: (target: "sprint" | "backlog") => void;
  onCreateSprint?: (payload: import("@/components/create-sprint-dialog").SprintPayload) => void;
  onEditSprint?: (id: string, payload: Partial<import("@/lib/work-item-types").Sprint>) => void;
  onDeleteSprint?: (id: string) => void;
  onStartSprint?: (id: string) => void;
  onCompleteSprint?: (id: string) => void;
  initialAiChanges?: WorkItemPayload | null;
}

export function SpaceTopbar({
  spaceId,
  spaceName,
  workspaceName,
  boardType,
  columns = DEFAULT_COLUMNS,
  items,
  sprints,
  pinned,
  currentUser,
  connectedRepo,
  fullscreen,
  onToggleFullscreen,
  onMove,
  onCreate,
  onCreateWithDate,
  onEditItem,
  onDeleteItem,
  onAddColumn,
  onConnectRepo,
  onViewRepo,
  onPinSpace,
  onDeleteSpace,
  onCreateBacklog,
  onCreateSprint,
  onEditSprint,
  onDeleteSprint,
  onStartSprint,
  onCompleteSprint,
  onUpdateItemDates,
  initialAiChanges,
}: SpaceTopbarProps) {
  const isScrum = boardType === "scrum";
  const [activeView, setActiveView] = useState<SpaceView>(isScrum ? "backlog" : "board");
  const [membersOpen, setMembersOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<SpaceWorkItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Board Intelli sidebar state
  const [intelliOpen, setIntelliOpen] = useState(false);
  const [intelliContext, setIntelliContext] = useState<SpaceWorkItem | null>(null);

  // Handle external AI changes (e.g. from the main Intelli workspace)
  useEffect(() => {
    if (initialAiChanges && initialAiChanges.id) {
      const item = items.find((i) => i.id === initialAiChanges.id);
      if (item) {
        setEditingItem(item);
        setEditDialogOpen(true);
      }
    }
  }, [initialAiChanges, items]);

  const doneId = columns[columns.length - 1]?.id;
  const backlogItems = items.filter((i) => i.status === "todo");
  const sprintItems = items.filter((i) => i.status !== "todo");

  const memberNames = [currentUser?.fullName || currentUser?.email || "You"];

  const epics = items.filter((it) => it.type === "epic");

  function copyLink() {
    try {
      navigator.clipboard?.writeText(window.location.href);
      toast({ title: "Link copied", description: "Space link copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "error" });
    }
  }

  function handleOpenEdit(item: SpaceWorkItem) {
    setEditingItem(item);
    setEditDialogOpen(true);
  }

  function handleOpenIntelli(item?: SpaceWorkItem) {
    if (!appEnv.enableIntelli) {
      toast({ title: "Upcoming", description: "Unify Intelli is coming soon!" });
      return;
    }
    setIntelliContext(item ?? null);
    setIntelliOpen(true);
  }

  async function handleEditSubmit(payload: WorkItemPayload) {
    if (editingItem) {
      onEditItem?.(editingItem, payload);
    }
  }

  function handleDeleteItem(id: string) {
    onDeleteItem?.(id);
    setEditDialogOpen(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Space header ──────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-navbar">
        {/* Row 1: space name + right actions */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 pt-3 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            {boardType === "kanban" ? (
              <img src="/kanban-sign.png" alt="Kanban" className="h-6 w-6 shrink-0 object-contain" />
            ) : boardType === "scrum" ? (
              <img src="/scrum-sign.png" alt="Scrum" className="h-6 w-6 shrink-0 object-contain" />
            ) : boardType === "bugtracker" || spaceName === "Bug Tracker" ? (
              <img src="/bug-sign.webp" alt="Bug Tracker" className="h-6 w-6 shrink-0 object-contain" />
            ) : boardType === "custom" ? (
              <img src="/custom-sign.png" alt="Custom" className="h-6 w-6 shrink-0 object-contain" />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-accent-foreground">
                {spaceName[0]?.toUpperCase() ?? "S"}
              </div>
            )}
            <h1 className="truncate text-[15px] font-bold text-foreground">{spaceName}</h1>
            <BoardCapsule kind={boardType} className="hidden sm:flex shrink-0" />
            {workspaceName && <span className="hidden text-[12px] font-semibold text-muted sm:inline">| {workspaceName}</span>}
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <AvatarCircles names={memberNames} size={24} className="mr-0.5" />

            <Button variant="outline" size="sm" className="hidden h-8 px-5 gap-1.5 text-[12px] sm:inline-flex" onClick={() => setMembersOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Members</span>
            </Button>

            {connectedRepo ? (
              <Button variant="outline" size="sm" className="hidden h-8 px-5 gap-1.5 text-[12px] sm:inline-flex" onClick={() => onViewRepo?.(connectedRepo.id)}>
                <Eye className="h-3.5 w-3.5" />
                <span>View Repo</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="hidden h-8 px-5 gap-1.5 text-[12px] sm:inline-flex" onClick={() => setRepoOpen(true)}>
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
                    "relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-semibold whitespace-nowrap transition-colors",
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
            {activeView === "list" && (
              <ListView
                items={items}
                onStatusChange={onMove}
                isScrum={isScrum}
                sprints={sprints}
                onCreateSprint={onCreateSprint}
                onEditSprint={onEditSprint}
                onDeleteSprint={onDeleteSprint}
                onStartSprint={onStartSprint}
                onCompleteSprint={onCompleteSprint}
              />
            )}
            {activeView === "board" && (
              <BoardView
                items={items}
                columns={columns}
                onMove={onMove}
                onCreate={onCreate}
                onEdit={handleOpenEdit}
                onAddColumn={onAddColumn}
              />
            )}
            {activeView === "timeline" && <TimelineView items={items} onUpdateItemDates={onUpdateItemDates} />}
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
                onCreateSprint={onCreateSprint}
              />
            )}
            {activeView === "reports" && (
              <ReportsView
                items={items}
                spaceName={spaceName}
                onOpenIntelli={() => handleOpenIntelli()}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Edit Work Item Modal ─────────────────────────────────────────── */}
      {editingItem && (
        <EditWorkItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          editing={editingItem}
          spaceName={spaceName}
          epics={epics}
          onSubmit={handleEditSubmit}
          onDelete={onDeleteItem ? handleDeleteItem : undefined}
          initialAiChanges={initialAiChanges}
          onOpenIntelli={(item) => {
            setEditDialogOpen(false);
            handleOpenIntelli(item);
          }}
        />
      )}

      {/* ── Board Intelli Sidebar ────────────────────────────────────────── */}
      <BoardIntelliSidebar
        open={intelliOpen}
        onClose={() => setIntelliOpen(false)}
        spaceName={spaceName}
        spaceId={spaceId}
        items={items}
        preloadedContext={intelliContext}
      />

      {/* ── Other Dialogs ────────────────────────────────────────────────── */}
      <AddMembersDialog open={membersOpen} onClose={() => setMembersOpen(false)} spaceName={spaceName} spaceId={spaceId} />
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
