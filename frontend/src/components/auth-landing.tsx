"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { getToken, clearToken, fetchWithAuth } from "@/lib/auth";
import { toast } from "@/lib/use-toast";
import { AppShell, type ShellWorkspace } from "@/components/app-shell";
import { SpaceTopbar } from "@/components/space-topbar";
import { RepoWorkspace } from "@/components/repo/repo-workspace";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { CreateWorkItemDialog } from "@/components/create-work-item-dialog";
import type { BoardKind, WorkItemType } from "@/lib/work-item-types";
import type { ConnectedRepository } from "@/lib/repo-types";
import { SEED_REPOSITORIES } from "@/lib/repo-types";

type WorkItem = {
  id: string;
  title: string;
  type: WorkItemType;
  status: string;
  assignee?: string | null;
  dueDate?: string | null;
};

type Space = {
  id: string;
  name: string;
  kind: BoardKind;
  workItems: WorkItem[];
};

type Workspace = {
  id: string;
  name: string;
  spaces: Space[];
};

const STORAGE_KEY = "unify.workspaces.v2";
const REPO_STORAGE_KEY = "unify.repositories.v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function seededWorkspace(): Workspace {
  return {
    id: uid("ws"),
    name: "Default Workspace",
    spaces: [
      {
        id: uid("sp"),
        name: "My Kanban Space",
        kind: "kanban",
        workItems: [
          { id: uid("wi"), title: "Bug Resolver", type: "bug", status: "inprogress", assignee: "VN", dueDate: "23 Jul" },
        ],
      },
    ],
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  const [user, setUser] = useState<{ fullName?: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemTargetStatus, setItemTargetStatus] = useState("todo");

  // ── Repositories (first-class sidebar entities) ─────────────────────────
  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REPO_STORAGE_KEY);
      setRepositories(raw ? JSON.parse(raw) : SEED_REPOSITORIES);
    } catch {
      setRepositories(SEED_REPOSITORIES);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(REPO_STORAGE_KEY, JSON.stringify(repositories));
    } catch {
      /* ignore quota errors */
    }
  }, [repositories]);

  function selectRepo(id: string) {
    setActiveRepoId(id);
  }

  function connectRepo(repo: ConnectedRepository) {
    setRepositories((r) => [repo, ...r]);
    setActiveRepoId(repo.id);
    toast({ title: "Repository connected", description: repo.fullName, variant: "success" });
  }

  const activeRepo = repositories.find((r) => r.id === activeRepoId) ?? null;

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    fetchWithAuth(`${apiBase}/api/v1/auth/me`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not authorized");
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        clearToken();
        router.replace("/");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Load workspaces (API first, local fallback) ────────────────────────
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/workspaces`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const list: Workspace[] = (data.workspaces ?? []).map((w: { id: string; name: string }) => ({
        id: w.id,
        name: w.name,
        spaces: [],
      }));
      if (list.length === 0) throw new Error("empty");
      setWorkspaces(list);
      setActiveWorkspaceId((prev) => prev ?? list[0].id);
    } catch {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: Workspace[] = raw ? JSON.parse(raw) : [seededWorkspace()];
        setWorkspaces(parsed);
        setActiveWorkspaceId((prev) => prev ?? parsed[0]?.id ?? null);
      } catch {
        const seeded = [seededWorkspace()];
        setWorkspaces(seeded);
        setActiveWorkspaceId(seeded[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      /* ignore quota errors */
    }
  }, [workspaces]);

  useEffect(() => {
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!activeSpaceId) setActiveSpaceId(ws?.spaces[0]?.id ?? null);
  }, [activeWorkspaceId, workspaces, activeSpaceId]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const activeSpace = activeWorkspace?.spaces.find((s) => s.id === activeSpaceId) ?? activeWorkspace?.spaces[0];

  // ── Mutations (optimistic, local-first) ─────────────────────────────────
  function createWorkspace(name: string) {
    const ws: Workspace = { id: uid("ws"), name, spaces: [] };
    setWorkspaces((s) => [ws, ...s]);
    setActiveWorkspaceId(ws.id);
    setActiveSpaceId(null);
    setActiveRepoId(null);
    toast({ title: "Workspace created", description: name, variant: "success" });

    fetchWithAuth(`${apiBase}/api/v1/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => { });
  }

  function createSpace(name: string, kind: BoardKind) {
    if (!activeWorkspaceId) return;
    const sp: Space = { id: uid("sp"), name, kind, workItems: [] };
    setWorkspaces((all) =>
      all.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, spaces: [sp, ...ws.spaces] } : ws)),
    );
    setActiveSpaceId(sp.id);
    setActiveRepoId(null);
    toast({ title: "Space created", description: `${name} · ${kind}`, variant: "success" });

    fetchWithAuth(`${apiBase}/api/v1/workspaces/${activeWorkspaceId}/spaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind }),
    }).catch(() => { });
  }

  function createWorkItem(title: string, type: WorkItemType) {
    if (!activeWorkspaceId || !activeSpaceId) return;
    const item: WorkItem = { id: uid("wi"), title, type, status: itemTargetStatus };
    setWorkspaces((all) =>
      all.map((ws) =>
        ws.id !== activeWorkspaceId
          ? ws
          : {
            ...ws,
            spaces: ws.spaces.map((sp) =>
              sp.id !== activeSpaceId ? sp : { ...sp, workItems: [item, ...sp.workItems] },
            ),
          },
      ),
    );
    toast({ title: `${type[0].toUpperCase()}${type.slice(1)} created`, description: title, variant: "success" });

    fetchWithAuth(`${apiBase}/api/v1/spaces/${activeSpaceId}/work_items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, status: itemTargetStatus }),
    }).catch(() => { });
  }

  /** Used for work items created from the repo Code tab ("Create Work Item" on a
   *  selected snippet). Falls back to the first available space if none is active
   *  yet, since the user may be inside a Repository Workspace with no space selected. */
  function createWorkItemFromRepo(title: string, type: WorkItemType) {
    const targetSpaceId = activeSpaceId ?? activeWorkspace?.spaces[0]?.id;
    const targetWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id;
    if (!targetSpaceId || !targetWorkspaceId) {
      toast({ title: "Create a space first", description: "Work items need a space to live in.", variant: "error" });
      return;
    }
    const item: WorkItem = { id: uid("wi"), title, type, status: "todo" };
    setWorkspaces((all) =>
      all.map((ws) =>
        ws.id !== targetWorkspaceId
          ? ws
          : { ...ws, spaces: ws.spaces.map((sp) => (sp.id !== targetSpaceId ? sp : { ...sp, workItems: [item, ...sp.workItems] })) },
      ),
    );
    toast({ title: `${type[0].toUpperCase()}${type.slice(1)} created from code`, description: title, variant: "success" });
  }

  function moveWorkItem(itemId: string, toStatus: string) {
    setWorkspaces((all) =>
      all.map((ws) => ({
        ...ws,
        spaces: ws.spaces.map((sp) => ({
          ...sp,
          workItems: sp.workItems.map((wi) => (wi.id === itemId ? { ...wi, status: toStatus } : wi)),
        })),
      })),
    );
    fetchWithAuth(`${apiBase}/api/v1/work_items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    }).catch(() => { });
  }

  function handleSignOut() {
    fetchWithAuth(`${apiBase}/api/v1/auth/signout`, { method: "POST" }).finally(() => {
      clearToken();
      router.replace("/");
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const shellWorkspaces: ShellWorkspace[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    spaces: w.spaces.map((s) => ({ id: s.id, name: s.name, kind: s.kind })),
  }));

  return (
    <AppShell
      workspaces={shellWorkspaces}
      activeWorkspaceId={activeWorkspace?.id ?? null}
      activeSpaceId={activeRepo ? null : activeSpace?.id ?? null}
      onSelectWorkspace={(id) => {
        setActiveRepoId(null);
        setActiveWorkspaceId(id);
        setActiveSpaceId(null);
      }}
      onSelectSpace={(id) => {
        setActiveRepoId(null);
        setActiveSpaceId(id);
      }}
      onCreateWorkspace={() => setWorkspaceDialogOpen(true)}
      onCreateSpace={() => setSpaceDialogOpen(true)}
      onCreateItem={() => {
        setItemTargetStatus("todo");
        setItemDialogOpen(true);
      }}
      repositories={repositories}
      activeRepoId={activeRepoId}
      onSelectRepo={selectRepo}
      onConnectRepo={connectRepo}
      user={user}
      onSignOut={handleSignOut}
    >
      {activeRepo ? (
        <RepoWorkspace repo={activeRepo} onCreateWorkItem={createWorkItemFromRepo} />
      ) : !activeSpace ? (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">Select or create a space to get started.</p>
            <p className="mt-1 text-[12px] text-muted">
              Spaces hold boards for epics, stories, tasks, subtasks and bugs.
            </p>
          </div>
        </div>
      ) : (
        <SpaceTopbar
          spaceName={activeSpace.name}
          workspaceName={activeWorkspace?.name}
          items={activeSpace.workItems}
          onMove={moveWorkItem}
          onCreate={(status) => {
            setItemTargetStatus(status);
            setItemDialogOpen(true);
          }}
          onCreateBacklog={(target) => {
            setItemTargetStatus(target === "sprint" ? "inprogress" : "todo");
            setItemDialogOpen(true);
          }}
        />
      )}

      <CreateWorkspaceDialog
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        onCreate={createWorkspace}
      />
      <CreateSpaceDialog open={spaceDialogOpen} onOpenChange={setSpaceDialogOpen} onCreate={createSpace} />
      <CreateWorkItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onCreate={createWorkItem}
        disabled={!activeSpace}
      />
    </AppShell>
  );
}