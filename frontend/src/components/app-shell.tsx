"use client";

import * as React from "react";
import Link from "next/link";
import { motion, Reorder, useDragControls } from "framer-motion";
import {
  LayoutGrid,
  Search,
  Plus,
  Bell,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Clock,
  Users,
  Layers3,
  Kanban,
  Lightbulb,
  LogOut,
  ChevronRight,
  GripVertical,
  SquareArrowOutUpRight,
  MoreVertical,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { RepoSidebarSection } from "@/components/repo/repo-sidebar-section";
import { BoardCapsule } from "@/components/ui/board-capsule";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { GlobalSearch } from "@/components/global-search";
import { NotificationPanel } from "@/components/notification-panel";
import { usePrefs } from "@/lib/prefs-context";
import { toast } from "@/lib/use-toast";
import { appEnv } from "@/config/env";
import type { ConnectedRepository } from "@/lib/repo-types";
import type { BoardKind } from "@/lib/work-item-types";
import { cn } from "@/lib/utils";

export type NavKey = "recent" | "teams" | "starred" | "settings" | "help";

export interface ShellSpace {
  id: string;
  name: string;
  kind: BoardKind;
  pinned?: boolean;
}
export interface ShellWorkspace {
  id: string;
  name: string;
  spaces: ShellSpace[];
}

interface AppShellProps {
  workspaces: ShellWorkspace[];
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  greetingName?: string;
  fullscreen?: boolean;
  onSelectWorkspace: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onCreateWorkspace: () => void;
  onCreateSpace: () => void;
  onCreateItem: () => void;
  onReorderWorkspaces?: (ids: string[]) => void;
  onReorderSpaces?: (workspaceId: string, ids: string[]) => void;
  onReorderRepos?: (ids: string[]) => void;
  activeNav?: NavKey | null;
  onSelectNav?: (nav: NavKey) => void;
  repositories: ConnectedRepository[];
  activeRepoId: string | null;
  onSelectRepo: (id: string) => void;
  onConnectRepo: (repo: ConnectedRepository) => void;
  onOpenIntelli?: () => void;
  intelliActive?: boolean;
  user: { fullName?: string | null; email: string } | null;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  const { greetingName, onCreateItem, user, onSignOut, fullscreen, onSelectNav } = props;
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarContent = (
    <SidebarBody
      {...props}
      collapsed={collapsed}
      onSelectWorkspace={(id) => {
        props.onSelectWorkspace(id);
        setMobileOpen(false);
      }}
      onSelectSpace={(id) => {
        props.onSelectSpace(id);
        setMobileOpen(false);
      }}
      onSelectRepo={(id) => {
        props.onSelectRepo(id);
        setMobileOpen(false);
      }}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar — hidden in fullscreen mode */}
      {!fullscreen && (
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-border-subtle bg-navbar py-2.5 pl-2.5 pr-0 transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-64",
          )}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} widthClassName="w-72">
        {sidebarContent}
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-navbar px-3 sm:px-4">
          {!fullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 md:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
            <span className="truncate text-[13.5px]">
              <span className="font-semibold text-foreground">Greetings{greetingName ? `, ${greetingName}` : ""}! </span>
              <span className="font-semibold text-muted">Welcome to your space.</span>
            </span>
          </div>

          <div className="flex-1 px-2 sm:px-4 max-w-md mx-auto">
            {/* Centered search */}
            <GlobalSearch
              workspaces={props.workspaces}
              onSelectSpace={(id) => {
                props.onSelectSpace(id);
              }}
              onSelectWorkspace={(id) => {
                props.onSelectWorkspace(id);
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={onCreateItem} className="hidden rounded-lg sm:inline-flex">
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
            <Button size="icon" variant="ghost" onClick={onCreateItem} className="h-8 w-8 sm:hidden" aria-label="Create">
              <Plus className="h-4 w-4" />
            </Button>
            {/* Icon group — equally spaced */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeToggle />
              <NotificationPanel onSelectSpace={props.onSelectSpace} />
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button className="rounded-full ring-2 ring-transparent hover:ring-border-subtle">
                    <Avatar name={user?.fullName ?? user?.email} size={28} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <div className="px-2.5 py-1.5">
                    <p className="truncate text-[13px] font-semibold">{user?.fullName || "Account"}</p>
                    <p className="truncate text-[11px] font-semibold text-muted">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSelectNav?.("settings")}>
                    <Settings className="h-3.5 w-3.5" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSelectNav?.("help")}>
                    <HelpCircle className="h-3.5 w-3.5" /> Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={onSignOut}>
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{props.children}</main>
      </div>
    </div>
  );
}

type SidebarBodyProps = AppShellProps & { collapsed: boolean };

function SidebarBody({
  workspaces,
  activeWorkspaceId,
  activeSpaceId,
  onSelectWorkspace,
  onSelectSpace,
  onCreateWorkspace,
  onCreateSpace,
  onReorderWorkspaces,
  onReorderSpaces,
  onReorderRepos,
  repositories,
  activeRepoId,
  onSelectRepo,
  onConnectRepo,
  onOpenIntelli,
  intelliActive,
  collapsed,
  activeNav,
  onSelectNav,
}: SidebarBodyProps) {
  const topNav: { icon: typeof Clock; label: string; nav: NavKey }[] = [
    { icon: Clock, label: "Recent", nav: "recent" },
    { icon: Users, label: "Teams", nav: "teams" },
    { icon: Star, label: "Starred", nav: "starred" },
  ];

  const [draggingSection, setDraggingSection] = React.useState<null | "ws" | "repo">(null);

  // Global safety-net: always clear the drop-zone highlight when the pointer
  // is released anywhere on the page (covers cases where the pointer-up fires
  // on Framer Motion's drag overlay instead of the item button).
  React.useEffect(() => {
    const clear = () => setDraggingSection(null);
    window.addEventListener("pointerup", clear);
    return () => window.removeEventListener("pointerup", clear);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto scroll-thin pr-2">
      {/* Circular Unify logo */}
      <Link href="/" className={cn("mb-2 flex items-center gap-2.5 px-1.5 py-1 transition-opacity hover:opacity-80", collapsed && "justify-center px-0")}>
        <Logo size={36} />
        {!collapsed && <span className="text-[18.5px] font-bold tracking-tight text-foreground">Unify</span>}
      </Link>

      {/* Recent / Teams / Starred */}
      <nav className="space-y-0.5">
        {topNav.map(({ icon: Icon, label, nav }) => {
          const active = activeNav === nav;
          return (
            <button
              key={label}
              onClick={() => onSelectNav?.(nav)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold hover:bg-foreground/[0.06]",
                active ? "bg-accent/10 text-accent" : "text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted")} />
              {!collapsed && label}
            </button>
          );
        })}
      </nav>

      {/* Unify Intelli (highlighted) */}
      <div className="mt-3 flex justify-center px-1.5">
        <HoverBorderGradient
          onClick={() => {
            if (!appEnv.enableIntelli) {
              toast({ title: "Upcoming", description: "Unify Intelli is coming soon!" });
              return;
            }
            onOpenIntelli?.();
          }}
          active={intelliActive}
          containerClassName={cn("w-full max-w-[225px]", collapsed && "w-min justify-center")}
          className={cn("group gap-2.5 px-2.5 py-2", collapsed && "px-0 justify-center")}
        >
          <Lightbulb className={cn("h-4 w-4 shrink-0 text-[#2f9aa6] group-hover:text-white transition-colors duration-300", intelliActive && "text-white")} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Unify Intelli</span>
              <SquareArrowOutUpRight className={cn("h-4 w-4 shrink-0 text-[#2f9aa6] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:text-white", intelliActive && "opacity-100 text-white")} />
            </>
          )}
        </HoverBorderGradient>
      </div>

      {/* Workspaces */}
      <div className="mt-3">
        <div className="flex items-center justify-between px-2.5">
          {!collapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Workspaces</span>
          )}
          <button
            onClick={onCreateWorkspace}
            aria-label="Create workspace"
            className={cn("rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground", collapsed && "mx-auto")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {collapsed ? (
          <div className="mt-1 space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={cn(
                  "flex w-full items-center justify-center rounded-lg px-0 py-1.5",
                  ws.id === activeWorkspaceId ? "bg-accent/10 text-accent" : "text-foreground hover:bg-foreground/[0.06]",
                )}
                title={ws.name}
              >
                <Layers3 className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={workspaces}
            onReorder={(next) => onReorderWorkspaces?.(next.map((w) => w.id))}
            className={cn("mt-1 space-y-1 rounded-lg p-0.5 transition-colors", draggingSection === "ws" && "drop-zone-active")}
          >
            {workspaces.map((ws) => (
              <WorkspaceRow
                key={ws.id}
                ws={ws}
                active={ws.id === activeWorkspaceId}
                activeSpaceId={activeSpaceId}
                onSelectWorkspace={onSelectWorkspace}
                onSelectSpace={onSelectSpace}
                onCreateSpace={onCreateSpace}
                onReorderSpaces={onReorderSpaces}
                onDragStart={() => setDraggingSection("ws")}
                onDragEnd={() => setDraggingSection(null)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Repositories */}
      <div
        className={cn("mt-3 rounded-lg p-0.5 transition-colors", draggingSection === "repo" && "drop-zone-active")}
      >
        <RepoSidebarSection
          repositories={repositories}
          activeRepoId={activeRepoId}
          onSelectRepo={onSelectRepo}
          onConnectRepo={onConnectRepo}
          onReorder={onReorderRepos}
          onDragStateChange={(d) => setDraggingSection(d ? "repo" : null)}
          collapsed={collapsed}
        />
      </div>
      {/* Bottom: Settings + Help */}
      <div className="mt-auto space-y-0.5 pt-3">
        <button
          onClick={() => onSelectNav?.("settings")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold hover:bg-foreground/[0.06]",
            activeNav === "settings" ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <Settings className={cn("h-4 w-4", activeNav === "settings" ? "text-accent" : undefined)} />
          {!collapsed && "Settings"}
        </button>
        <button
          onClick={() => onSelectNav?.("help")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold hover:bg-foreground/[0.06]",
            activeNav === "help" ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <HelpCircle className={cn("h-4 w-4", activeNav === "help" ? "text-accent" : undefined)} />
          {!collapsed && "Help"}
        </button>
      </div>
    </div>
  );
}

// ─── Drag handle with hover-to-arm cursor ────────────────────────────────────

function DragHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <span
      onPointerDown={onPointerDown}
      className="drag-handle -ml-1 flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  );
}

// ─── Workspace row (with nested draggable spaces) ────────────────────────────

function WorkspaceRow({
  ws,
  active,
  activeSpaceId,
  onSelectWorkspace,
  onSelectSpace,
  onCreateSpace,
  onReorderSpaces,
  onDragStart,
  onDragEnd,
}: {
  ws: ShellWorkspace;
  active: boolean;
  activeSpaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onCreateSpace: () => void;
  onReorderSpaces?: (workspaceId: string, ids: string[]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const [armed, setArmed] = React.useState(false);
  const armTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = React.useState(active);

  React.useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  function handleEnter() {
    armTimer.current = setTimeout(() => setArmed(true), 5000);
  }
  function handleLeave() {
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(false);
  }

  return (
    <Reorder.Item value={ws} dragListener={false} dragControls={controls} className="list-none">
      <motion.div
        layout="position"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onPointerUp={onDragEnd}
        onPointerDown={(e) => {
          if (armed) {
            onDragStart();
            controls.start(e);
          }
        }}
        className={cn("group flex items-center gap-1 rounded-lg pr-1", armed && "drag-armed")}
      >
        <DragHandle
          onPointerDown={(e) => {
            onDragStart();
            controls.start(e);
          }}
        />
        <motion.button
          layout="position"
          onClick={() => {
            onSelectWorkspace(ws.id);
            setExpanded(!expanded);
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-[13px] font-semibold hover:bg-foreground/[0.06]",
            active ? "bg-accent/10 text-accent" : "text-foreground",
          )}
        >
          <Layers3 className="h-3.5 w-3.5 shrink-0" />
          <motion.span layout="position" className="truncate flex-1">{ws.name}</motion.span>
          <ChevronRight className={cn("ml-auto h-3 w-3 shrink-0 transition-transform", expanded && "rotate-90")} />
        </motion.button>
      </motion.div>

      {expanded && (
        <div className="ml-4 mt-1.5 border-l-2 border-border-subtle pl-2 mb-1.5">
          <Reorder.Group
            axis="y"
            values={ws.spaces}
            onReorder={(next) => onReorderSpaces?.(ws.id, next.map((s) => s.id))}
            className="space-y-0.5"
          >
            {ws.spaces.map((sp) => (
              <SpaceRow
                key={sp.id}
                sp={sp}
                active={sp.id === activeSpaceId}
                onSelect={() => onSelectSpace(sp.id)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </Reorder.Group>
          <button
            onClick={onCreateSpace}
            className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-semibold text-muted hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Create space
          </button>
        </div>
      )}
    </Reorder.Item>
  );
}

function SpaceRow({
  sp,
  active,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  sp: ShellSpace;
  active: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const [armed, setArmed] = React.useState(false);
  const armTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isStarred, toggleStar } = usePrefs();
  const starred = isStarred(sp.id);

  return (
    <Reorder.Item value={sp} dragListener={false} dragControls={controls} className="list-none">
      <div
        onMouseEnter={() => (armTimer.current = setTimeout(() => setArmed(true), 5000))}
        onMouseLeave={() => {
          if (armTimer.current) clearTimeout(armTimer.current);
          setArmed(false);
        }}
        onPointerUp={onDragEnd}
        onPointerDown={(e) => {
          if (armed) {
            onDragStart();
            controls.start(e);
          }
        }}
        className={cn("group flex items-center gap-1 rounded-md", armed && "drag-armed")}
      >
        <DragHandle
          onPointerDown={(e) => {
            onDragStart();
            controls.start(e);
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          className={cn(
            "group/tab flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[12.5px] font-semibold hover:bg-foreground/[0.06]",
            active ? "bg-accent/10 text-accent" : "text-foreground",
          )}
        >
          {sp.kind === "kanban" ? (
              <img src="/kanban-sign.png" alt="Kanban" className="h-3.5 w-3.5 shrink-0 object-contain" />
            ) : sp.kind === "scrum" ? (
              <img src="/scrum-sign.png" alt="Scrum" className="h-3.5 w-3.5 shrink-0 object-contain" />
            ) : sp.kind === "bugtracker" || sp.name === "Bug Tracker" ? (
              <img src="/bug-sign.webp" alt="Bug Tracker" className="h-3.5 w-3.5 shrink-0 object-contain" />
            ) : sp.kind === "custom" ? (
              <img src="/custom-sign.png" alt="Custom" className="h-3.5 w-3.5 shrink-0 object-contain" />
            ) : (
              <Kanban className="h-3 w-3 shrink-0 text-muted" />
            )}
          <span className="truncate">{sp.name}</span>
          <BoardCapsule kind={sp.kind} className="ml-auto shrink-0" />
          
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button
                onClick={(e) => e.stopPropagation()}
                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-transparent opacity-0 transition-opacity hover:bg-foreground/[0.08] group-hover/tab:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="min-w-[140px] p-1">
              <DropdownMenuItem onClick={() => toggleStar(sp.id)} className="px-2 py-1 text-xs h-auto cursor-pointer">
                {starred ? "Unstar Space" : "Star Space"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem className="px-2 py-1 text-xs h-auto cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-600">
                Delete Space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Reorder.Item>
  );
}
