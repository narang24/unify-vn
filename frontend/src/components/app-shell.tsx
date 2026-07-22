"use client";

import * as React from "react";
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
  User as UserIcon,
  Layers3,
  SlidersHorizontal,
  LogOut,
  ChevronRight,
  Kanban,
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
import { cn } from "@/lib/utils";

export interface ShellSpace {
  id: string;
  name: string;
  kind: string;
}
export interface ShellWorkspace {
  id: string;
  name: string;
  spaces: ShellSpace[];
}

export function AppShell({
  workspaces,
  activeWorkspaceId,
  activeSpaceId,
  onSelectWorkspace,
  onSelectSpace,
  onCreateWorkspace,
  onCreateSpace,
  onCreateItem,
  user,
  onSignOut,
  children,
}: {
  workspaces: ShellWorkspace[];
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onCreateWorkspace: () => void;
  onCreateSpace: () => void;
  onCreateItem: () => void;
  user: { fullName?: string | null; email: string } | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarContent = (
    <SidebarBody
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      activeSpaceId={activeSpaceId}
      onSelectWorkspace={(id) => {
        onSelectWorkspace(id);
        setMobileOpen(false);
      }}
      onSelectSpace={(id) => {
        onSelectSpace(id);
        setMobileOpen(false);
      }}
      onCreateWorkspace={onCreateWorkspace}
      onCreateSpace={onCreateSpace}
      collapsed={collapsed}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border-subtle bg-panel p-3 transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} widthClassName="w-72">
        {sidebarContent}
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-panel px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-1.5 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-foreground">
              U
            </div>
            <span className="text-lg font-semibold italic tracking-tight text-accent">Unify</span>
          </div>

          <div className="relative mx-1 flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input placeholder="Search" className="h-9 rounded-full pl-8 text-[13px]" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" onClick={onCreateItem} className="hidden sm:inline-flex">
              <Plus className="h-3.5 w-3.5" /> Create
            </Button>
            <Button size="icon" variant="ghost" onClick={onCreateItem} className="sm:hidden" aria-label="Create">
              <Plus className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Help">
              <HelpCircle className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="ml-1 rounded-full ring-2 ring-transparent hover:ring-border-subtle">
                  <Avatar name={user?.fullName ?? user?.email} size={30} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="px-2.5 py-1.5">
                  <p className="truncate text-[13px] font-medium">{user?.fullName || "Account"}</p>
                  <p className="truncate text-[11px] text-muted">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-3.5 w-3.5" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem destructive onClick={onSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  workspaces,
  activeWorkspaceId,
  activeSpaceId,
  onSelectWorkspace,
  onSelectSpace,
  onCreateWorkspace,
  onCreateSpace,
  collapsed,
}: {
  workspaces: ShellWorkspace[];
  activeWorkspaceId: string | null;
  activeSpaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onCreateWorkspace: () => void;
  onCreateSpace: () => void;
  collapsed: boolean;
}) {
  const navItems = [
    { icon: UserIcon, label: "For you" },
    { icon: Clock, label: "Recent" },
    { icon: Star, label: "Starred" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto scroll-thin">
      <nav className="space-y-0.5">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-foreground hover:bg-black/5",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted" />
            {!collapsed && label}
          </button>
        ))}
      </nav>

      <div className="mt-4 flex items-center justify-between px-2.5">
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Workspaces</span>
        )}
        <button
          onClick={onCreateWorkspace}
          aria-label="Create workspace"
          className="rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1 space-y-1">
        {workspaces.map((ws) => {
          const isActiveWs = ws.id === activeWorkspaceId;
          return (
            <div key={ws.id}>
              <button
                onClick={() => onSelectWorkspace(ws.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium hover:bg-black/5",
                  isActiveWs ? "bg-accent/10 text-accent" : "text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Layers3 className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span className="truncate">{ws.name}</span>}
                {!collapsed && <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", isActiveWs && "rotate-90")} />}
              </button>

              {!collapsed && isActiveWs && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border-subtle pl-2">
                  {ws.spaces.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => onSelectSpace(sp.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-black/5",
                        sp.id === activeSpaceId ? "bg-accent/10 font-medium text-accent" : "text-foreground",
                      )}
                    >
                      <Kanban className="h-3 w-3 shrink-0 text-muted" />
                      <span className="truncate">{sp.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={onCreateSpace}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-muted hover:bg-black/5 hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> Create space
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted hover:bg-black/5 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {!collapsed && "Customise sidebar"}
        </button>
      </div>
    </div>
  );
}
