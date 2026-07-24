"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, GitBranch, Kanban, Bot } from "lucide-react";

import { getToken, clearToken, fetchWithAuth, setToken } from "@/lib/auth";
import { toast } from "@/lib/use-toast";
import { AppShell, type ShellWorkspace, type NavKey } from "@/components/app-shell";
import { RecentsPanel, StarredPanel, TeamsPanel } from "@/components/nav-panels";
import { usePrefs } from "@/lib/prefs-context";
import { SpaceTopbar } from "@/components/space-topbar";
import { RepoWorkspace } from "@/components/repo/repo-workspace";
import { UnifyIntelliWorkspace } from "@/components/unify-intelli/unify-intelli-workspace";
import { IncidentProvider } from "@/lib/incident-context";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { CreateSpaceDialog } from "@/components/create-space-dialog";
import { WorkItemDialog, type WorkItemPayload } from "@/components/create-work-item-dialog";
import { DEFAULT_COLUMNS, type BoardColumn, type BoardKind, type SpaceWorkItem, type WorkItemType } from "@/lib/work-item-types";
import type { ConnectedRepository } from "@/lib/repo-types";
import * as api from "@/lib/api";
import type { ApiSpace, ApiWorkItem, ApiRepository } from "@/lib/api";

type WorkItem = SpaceWorkItem;

type Space = {
  id: string;
  name: string;
  kind: BoardKind;
  columns: BoardColumn[];
  workItems: WorkItem[];
  pinned?: boolean;
  repoId?: string | null;
};

type Workspace = {
  id: string;
  name: string;
  spaces: Space[];
};

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
        columns: DEFAULT_COLUMNS.map((c) => ({ ...c })),
        workItems: [
          { id: uid("wi"), title: "Bug Resolver", type: "bug", status: "inprogress", assignee: "VN", dueDate: "2026-07-23" },
        ],
      },
    ],
  };
}

// ─── Mappers: backend (real) → local view models ─────────────────────────────
function mapApiSpace(s: ApiSpace): Space {
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    columns: s.columns?.length ? s.columns : DEFAULT_COLUMNS.map((c) => ({ ...c })),
    workItems: [],
    pinned: s.pinned,
    repoId: s.repositoryId,
  };
}
function mapApiWorkItem(w: ApiWorkItem): WorkItem {
  return {
    id: w.id,
    title: w.title,
    type: w.type,
    status: w.status,
    assignee: w.assignee,
    dueDate: w.dueDate,
    description: w.description,
    label: w.label,
    epicId: w.epicId,
    attachments: w.attachments ?? [],
  };
}
function mapApiRepo(r: ApiRepository): ConnectedRepository {
  return {
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    provider: r.provider,
    defaultBranch: r.defaultBranch,
    connectedAt: "recently",
    avatarColor: r.avatarColor,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  // ── Email/password auth state ────────────────────────────────────────────
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [user, setUser] = useState<{ fullName?: string | null; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemTargetStatus, setItemTargetStatus] = useState("todo");
  const [itemDefaultDue, setItemDefaultDue] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey | null>(null);
  const { pushRecent } = usePrefs();

  // ── Repositories (first-class sidebar entities) ─────────────────────────
  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);

  // ── Unify Intelli dedicated AI workspace ────────────────────────────────
  const [intelliOpen, setIntelliOpen] = useState(false);

  function openIntelliWorkspace() {
    setActiveRepoId(null);
    setActiveNav(null);
    setIntelliOpen(true);
  }

  // Load real repositories for the active workspace.
  useEffect(() => {
    if (!activeWorkspaceId) return;
    api
      .listRepositories(activeWorkspaceId)
      .then((list) => setRepositories(list.map(mapApiRepo)))
      .catch(() => setRepositories([]));
  }, [activeWorkspaceId]);

  function selectRepo(id: string) {
    setIntelliOpen(false);
    setActiveNav(null);
    setActiveRepoId(id);
    pushRecent("repo", id);
  }

  /** Persist a connected repo (from the sidebar's connect dialog). */
  async function connectRepo(repo: ConnectedRepository) {
    setIntelliOpen(false);
    if (!activeWorkspaceId) return;
    try {
      const created = await api.createRepository(activeWorkspaceId, {
        name: repo.name,
        fullName: repo.fullName,
        provider: repo.provider,
        defaultBranch: repo.defaultBranch,
        avatarColor: repo.avatarColor,
      });
      const mapped = mapApiRepo(created);
      setRepositories((r) => [mapped, ...r.filter((x) => x.id !== mapped.id)]);
      setActiveRepoId(mapped.id);
      toast({ title: "Repository connected", description: mapped.fullName, variant: "success" });
    } catch {
      // offline fallback: keep it local
      setRepositories((r) => (r.find((x) => x.id === repo.id) ? r : [repo, ...r]));
      setActiveRepoId(repo.id);
      toast({ title: "Repository connected", description: repo.fullName, variant: "success" });
    }
  }

  /** Connect a repo *to the active space* (from the space topbar). */
  async function connectRepoToSpace(repo: ConnectedRepository) {
    if (!activeWorkspaceId || !activeSpaceId) return;
    try {
      const created = await api.createRepository(activeWorkspaceId, {
        name: repo.name,
        fullName: repo.fullName,
        provider: repo.provider,
        defaultBranch: repo.defaultBranch,
        avatarColor: repo.avatarColor,
      });
      const mapped = mapApiRepo(created);
      setRepositories((r) => [mapped, ...r.filter((x) => x.id !== mapped.id)]);
      await api.updateSpace(activeSpaceId, { repositoryId: mapped.id }).catch(() => {});
      setWorkspaces((all) =>
        all.map((ws) =>
          ws.id !== activeWorkspaceId
            ? ws
            : { ...ws, spaces: ws.spaces.map((sp) => (sp.id === activeSpaceId ? { ...sp, repoId: mapped.id } : sp)) },
        ),
      );
      toast({ title: "Repository connected", description: mapped.fullName, variant: "success" });
    } catch {
      setRepositories((r) => (r.find((x) => x.id === repo.id) ? r : [repo, ...r]));
      toast({ title: "Repository connected", description: repo.fullName, variant: "success" });
    }
  }

  const activeRepo = repositories.find((r) => r.id === activeRepoId) ?? null;

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
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
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Load workspaces (real data; offline fallback only) ──────────────────
  const loadWorkspaces = useCallback(async () => {
    if (!getToken()) return;
    try {
      let list = await api.listWorkspaces();
      if (list.length === 0) {
        // First run → create a real Default Workspace + Kanban space.
        const ws = await api.createWorkspace("Default Workspace");
        await api.createSpace(ws.id, { name: "My Kanban Space", kind: "kanban" }).catch(() => {});
        list = [ws];
      }
      setWorkspaces(list.map((w) => ({ id: w.id, name: w.name, spaces: [] })));
      setActiveWorkspaceId((prev) => prev ?? list[0].id);
    } catch {
      const seeded = [seededWorkspace()];
      setWorkspaces(seeded);
      setActiveWorkspaceId((prev) => prev ?? seeded[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) loadWorkspaces();
  }, [user, loadWorkspaces]);

  // Fetch real spaces for the active workspace.
  useEffect(() => {
    if (!activeWorkspaceId) return;
    api
      .listSpaces(activeWorkspaceId)
      .then((spaces) => {
        const mapped = spaces
          .slice()
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map(mapApiSpace);
        setWorkspaces((all) =>
          all.map((ws) =>
            ws.id !== activeWorkspaceId
              ? ws
              : {
                  ...ws,
                  spaces: mapped.map((sp) => {
                    const prev = ws.spaces.find((e) => e.id === sp.id);
                    return prev ? { ...sp, workItems: prev.workItems } : sp;
                  }),
                },
          ),
        );
      })
      .catch(() => {});
  }, [activeWorkspaceId]);

  // Fetch real work items for the active space.
  useEffect(() => {
    if (!activeSpaceId) return;
    api
      .listWorkItems(activeSpaceId)
      .then((items) => {
        const mapped = items.map(mapApiWorkItem);
        setWorkspaces((all) =>
          all.map((ws) => ({
            ...ws,
            spaces: ws.spaces.map((sp) => (sp.id === activeSpaceId ? { ...sp, workItems: mapped } : sp)),
          })),
        );
      })
      .catch(() => {});
  }, [activeSpaceId]);

  useEffect(() => {
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!activeSpaceId) setActiveSpaceId(ws?.spaces[0]?.id ?? null);
  }, [activeWorkspaceId, workspaces, activeSpaceId]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const activeSpace = activeWorkspace?.spaces.find((s) => s.id === activeSpaceId) ?? activeWorkspace?.spaces[0];
  const activeSpaceRepo = activeSpace?.repoId ? repositories.find((r) => r.id === activeSpace.repoId) ?? null : null;

  // ── Mutations (optimistic, local-first) ─────────────────────────────────
  async function createWorkspace(name: string) {
    setActiveRepoId(null);
    setIntelliOpen(false);
    try {
      const ws = await api.createWorkspace(name);
      setWorkspaces((s) => [{ id: ws.id, name: ws.name, spaces: [] }, ...s]);
      setActiveWorkspaceId(ws.id);
      setActiveSpaceId(null);
      toast({ title: "Workspace created", description: name, variant: "success" });
    } catch {
      const ws: Workspace = { id: uid("ws"), name, spaces: [] };
      setWorkspaces((s) => [ws, ...s]);
      setActiveWorkspaceId(ws.id);
      setActiveSpaceId(null);
      toast({ title: "Workspace created", description: name, variant: "success" });
    }
  }

  async function createSpace(name: string, kind: BoardKind) {
    if (!activeWorkspaceId) return;
    setActiveRepoId(null);
    setIntelliOpen(false);
    try {
      const created = await api.createSpace(activeWorkspaceId, { name, kind });
      const sp = mapApiSpace(created);
      setWorkspaces((all) => all.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, spaces: [sp, ...ws.spaces] } : ws)));
      setActiveSpaceId(sp.id);
      toast({ title: "Space created", description: `${name} · ${kind}`, variant: "success" });
    } catch {
      const sp: Space = { id: uid("sp"), name, kind, columns: DEFAULT_COLUMNS.map((c) => ({ ...c })), workItems: [] };
      setWorkspaces((all) => all.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, spaces: [sp, ...ws.spaces] } : ws)));
      setActiveSpaceId(sp.id);
      toast({ title: "Space created", description: `${name} · ${kind}`, variant: "success" });
    }
  }

  async function upsertWorkItem(payload: WorkItemPayload) {
    if (!activeWorkspaceId || !activeSpaceId) return;

    // Editing an existing item
    if (payload.id) {
      setWorkspaces((all) =>
        all.map((ws) => ({
          ...ws,
          spaces: ws.spaces.map((sp) => ({
            ...sp,
            workItems: sp.workItems.map((wi) => (wi.id === payload.id ? { ...wi, ...payload } : wi)),
          })),
        })),
      );
      toast({ title: "Work item updated", description: payload.title, variant: "success" });
      api.updateWorkItem(payload.id, payload as Partial<ApiWorkItem>).catch(() => {});
      return;
    }

    const body = { ...payload, status: itemTargetStatus };
    try {
      const created = await api.createWorkItem(activeSpaceId, body as Partial<ApiWorkItem>);
      const item = mapApiWorkItem(created);
      setWorkspaces((all) =>
        all.map((ws) =>
          ws.id !== activeWorkspaceId
            ? ws
            : { ...ws, spaces: ws.spaces.map((sp) => (sp.id !== activeSpaceId ? sp : { ...sp, workItems: [item, ...sp.workItems] })) },
        ),
      );
    } catch {
      const item: WorkItem = { id: uid("wi"), status: itemTargetStatus, ...payload };
      setWorkspaces((all) =>
        all.map((ws) =>
          ws.id !== activeWorkspaceId
            ? ws
            : { ...ws, spaces: ws.spaces.map((sp) => (sp.id !== activeSpaceId ? sp : { ...sp, workItems: [item, ...sp.workItems] })) },
        ),
      );
    }
    toast({ title: `${payload.type[0].toUpperCase()}${payload.type.slice(1)} created`, description: payload.title, variant: "success" });
  }

  function deleteWorkItem(id: string) {
    setWorkspaces((all) =>
      all.map((ws) => ({
        ...ws,
        spaces: ws.spaces.map((sp) => ({ ...sp, workItems: sp.workItems.filter((wi) => wi.id !== id) })),
      })),
    );
    toast({ title: "Work item deleted", variant: "success" });
    api.deleteWorkItem(id).catch(() => {});
  }

  async function createWorkItemFromRepo(title: string, type: WorkItemType, attachments?: { id: string; name: string; meta?: string }[]) {
    const targetSpaceId = activeSpaceId ?? activeWorkspace?.spaces[0]?.id;
    const targetWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id;
    if (!targetSpaceId || !targetWorkspaceId) {
      toast({ title: "Create a space first", description: "Work items need a space to live in.", variant: "error" });
      return;
    }
    let item: WorkItem = { id: uid("wi"), title, type, status: "todo", attachments };
    try {
      const created = await api.createWorkItem(targetSpaceId, { title, type, status: "todo", attachments });
      item = mapApiWorkItem(created);
    } catch {
      /* keep local */
    }
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
    api.updateWorkItem(itemId, { status: toStatus }).catch(() => {});
  }

  async function addColumn(label: string) {
    if (!activeWorkspaceId || !activeSpaceId) return;
    const spaceId = activeSpaceId;
    try {
      const updated = await api.addSpaceColumn(spaceId, label);
      setWorkspaces((all) =>
        all.map((ws) => ({
          ...ws,
          spaces: ws.spaces.map((sp) => (sp.id === spaceId ? { ...sp, columns: updated.columns } : sp)),
        })),
      );
    } catch {
      const col: BoardColumn = { id: uid("col"), label };
      setWorkspaces((all) =>
        all.map((ws) => ({
          ...ws,
          spaces: ws.spaces.map((sp) => (sp.id === spaceId ? { ...sp, columns: [...(sp.columns ?? DEFAULT_COLUMNS), col] } : sp)),
        })),
      );
    }
    toast({ title: "Status added", description: label, variant: "success" });
  }

  function togglePinSpace(spaceId: string) {
    let nextPinned = false;
    setWorkspaces((all) =>
      all.map((ws) => ({
        ...ws,
        spaces: ws.spaces.map((sp) => {
          if (sp.id !== spaceId) return sp;
          nextPinned = !sp.pinned;
          return { ...sp, pinned: nextPinned };
        }),
      })),
    );
    api.updateSpace(spaceId, { pinned: nextPinned }).catch(() => {});
  }

  function deleteSpace(spaceId: string) {
    setWorkspaces((all) => all.map((ws) => ({ ...ws, spaces: ws.spaces.filter((sp) => sp.id !== spaceId) })));
    if (activeSpaceId === spaceId) setActiveSpaceId(null);
    toast({ title: "Space deleted", variant: "success" });
    api.deleteSpace(spaceId).catch(() => {});
  }

  // ── Reordering (drag-and-drop from the sidebar) ─────────────────────────
  function reorderWorkspaces(ids: string[]) {
    setWorkspaces((all) => ids.map((id) => all.find((w) => w.id === id)!).filter(Boolean));
  }
  function reorderSpaces(workspaceId: string, ids: string[]) {
    setWorkspaces((all) =>
      all.map((ws) => (ws.id === workspaceId ? { ...ws, spaces: ids.map((id) => ws.spaces.find((s) => s.id === id)!).filter(Boolean) } : ws)),
    );
    api.reorderSpaces(workspaceId, ids).catch(() => {});
  }
  function reorderRepos(ids: string[]) {
    setRepositories((all) => ids.map((id) => all.find((r) => r.id === id)!).filter(Boolean));
    if (activeWorkspaceId) api.reorderRepositories(activeWorkspaceId, ids).catch(() => {});
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = authTab === "signin"
        ? `${apiBase}/api/v1/auth/signin`
        : `${apiBase}/api/v1/auth/signup`;
      const body: Record<string, string> = { email: authEmail, password: authPassword };
      if (authTab === "signup" && authName.trim()) body.fullName = authName.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setToken(data.accessToken);
      setUser(data.user);
      setAuthModalOpen(false);
      // The workspace loader creates a real Default Workspace on first sign-in.
    } catch {
      setAuthError("Network error. Please check your connection.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSignOut() {
    fetchWithAuth(`${apiBase}/api/v1/auth/signout`, { method: "POST" }).finally(() => {
      clearToken();
      setUser(null);
    });
  }

  const apiBase2 = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  function openAuth(tab: "signin" | "signup") {
    setAuthTab(tab);
    setAuthError(null);
    setAuthModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // ── Landing page + auth modal (shown when unauthenticated) ───────────────
  if (!user) {
    return (
      <div className="landing-root">
        <LandingHero onSignIn={() => openAuth("signin")} onSignUp={() => openAuth("signup")} />

        <AnimatePresence>
          {authModalOpen && (
            <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/45"
                onClick={() => setAuthModalOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="auth-card relative"
              >
                <button
                  onClick={() => setAuthModalOpen(false)}
                  aria-label="Close"
                  className="absolute right-3.5 top-3.5 rounded-md p-1 text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="auth-logo-wrap">
                  <div className="auth-logo-icon">U</div>
                  <h1 className="auth-title">Welcome to Unify</h1>
                  <p className="auth-subtitle">
                    {authTab === "signin" ? "Sign in to continue" : "Create your account"}
                  </p>
                </div>

                <div className="auth-tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={authTab === "signin"}
                    className={`auth-tab${authTab === "signin" ? " auth-tab--active" : ""}`}
                    onClick={() => { setAuthTab("signin"); setAuthError(null); }}
                  >
                    Sign In
                  </button>
                  <button
                    role="tab"
                    aria-selected={authTab === "signup"}
                    className={`auth-tab${authTab === "signup" ? " auth-tab--active" : ""}`}
                    onClick={() => { setAuthTab("signup"); setAuthError(null); }}
                  >
                    Sign Up
                  </button>
                </div>

                <form className="auth-form" onSubmit={handleEmailAuth} noValidate>
                  {authTab === "signup" && (
                    <div className="auth-field">
                      <label htmlFor="auth-name" className="auth-label">Full Name</label>
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Doe"
                        className="auth-input"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="auth-field">
                    <label htmlFor="auth-email" className="auth-label">Email</label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="auth-input"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>

                  <div className="auth-field">
                    <label htmlFor="auth-password" className="auth-label">Password</label>
                    <div className="auth-password-wrap">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={authTab === "signin" ? "current-password" : "new-password"}
                        placeholder="••••••••"
                        required
                        className="auth-input auth-input--password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-eye-btn"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {authError && <p className="auth-error" role="alert">{authError}</p>}

                  <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                    {authLoading ? <span className="auth-spinner" /> : authTab === "signin" ? "Sign In" : "Create Account"}
                  </button>
                </form>

                <div className="auth-divider">
                  <span className="auth-divider-line" />
                  <span className="auth-divider-text">or continue with</span>
                  <span className="auth-divider-line" />
                </div>

                <div className="auth-oauth-row">
                  <a href={`${apiBase2}/api/v1/auth/oauth/github`} className="auth-oauth-btn" title="Continue with GitHub">
                    <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  <a href={`${apiBase2}/api/v1/auth/oauth/google`} className="auth-oauth-btn" title="Continue with Google">
                    <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </a>
                  <a href={`${apiBase2}/api/v1/auth/oauth/gitlab`} className="auth-oauth-btn" title="Continue with GitLab">
                    <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="#FC6D26" aria-hidden="true">
                      <path d="M4.845.904a.93.93 0 0 0-.888.63L.108 11.854a1.307 1.307 0 0 0 .474 1.46L12 22.096l11.418-8.782a1.307 1.307 0 0 0 .474-1.46L20.044 1.534a.93.93 0 0 0-.888-.63.93.93 0 0 0-.888.63l-2.552 7.85H8.284L5.732 1.534A.93.93 0 0 0 4.845.904z" />
                    </svg>
                    <span>GitLab</span>
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const shellWorkspaces: ShellWorkspace[] = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    spaces: w.spaces.map((s) => ({ id: s.id, name: s.name, kind: s.kind, pinned: s.pinned })),
  }));

  const firstName = (user.fullName || user.email).split(/[ @]/)[0];

  return (
    <IncidentProvider repositories={repositories}>
    <AppShell
      workspaces={shellWorkspaces}
      activeWorkspaceId={activeWorkspace?.id ?? null}
      activeSpaceId={activeRepo || intelliOpen || activeNav ? null : activeSpace?.id ?? null}
      greetingName={firstName}
      fullscreen={fullscreen}
      activeNav={activeNav}
      onSelectNav={(nav) => setActiveNav(nav)}
      onSelectWorkspace={(id) => {
        setIntelliOpen(false);
        setActiveNav(null);
        setActiveRepoId(null);
        setActiveWorkspaceId(id);
        setActiveSpaceId(null);
      }}
      onSelectSpace={(id) => {
        setIntelliOpen(false);
        setActiveNav(null);
        setActiveRepoId(null);
        setActiveSpaceId(id);
        pushRecent("space", id);
      }}
      onCreateWorkspace={() => setWorkspaceDialogOpen(true)}
      onCreateSpace={() => setSpaceDialogOpen(true)}
      onCreateItem={() => {
        setEditingItem(null);
        setItemTargetStatus("todo");
        setItemDefaultDue(null);
        setItemDialogOpen(true);
      }}
      onReorderWorkspaces={reorderWorkspaces}
      onReorderSpaces={reorderSpaces}
      onReorderRepos={reorderRepos}
      repositories={repositories}
      activeRepoId={activeRepoId}
      onSelectRepo={selectRepo}
      onConnectRepo={connectRepo}
      onOpenIntelli={openIntelliWorkspace}
      intelliActive={intelliOpen}
      user={user}
      onSignOut={handleSignOut}
    >
      {activeNav === "recent" ? (
        <RecentsPanel workspaces={shellWorkspaces} repositories={repositories} onSelectSpace={(id) => { setActiveNav(null); setActiveRepoId(null); setActiveSpaceId(id); pushRecent("space", id); }} onSelectRepo={selectRepo} />
      ) : activeNav === "starred" ? (
        <StarredPanel workspaces={shellWorkspaces} repositories={repositories} onSelectSpace={(id) => { setActiveNav(null); setActiveRepoId(null); setActiveSpaceId(id); pushRecent("space", id); }} onSelectRepo={selectRepo} />
      ) : activeNav === "teams" ? (
        <TeamsPanel workspaces={shellWorkspaces} repositories={repositories} currentUser={user.fullName || user.email} onSelectSpace={(id) => { setActiveNav(null); setActiveRepoId(null); setActiveSpaceId(id); pushRecent("space", id); }} onSelectRepo={selectRepo} />
      ) : intelliOpen ? (
        <UnifyIntelliWorkspace />
      ) : activeRepo ? (
        <RepoWorkspace
          repo={activeRepo}
          onCreateWorkItem={createWorkItemFromRepo}
          onOpenIntelliWorkspace={openIntelliWorkspace}
        />
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
          key={activeSpace.id}
          spaceName={activeSpace.name}
          workspaceName={activeWorkspace?.name}
          boardType={activeSpace.kind}
          columns={activeSpace.columns ?? DEFAULT_COLUMNS}
          items={activeSpace.workItems}
          pinned={!!activeSpace.pinned}
          currentUser={user}
          connectedRepo={activeSpaceRepo}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen((f) => !f)}
          onMove={moveWorkItem}
          onCreate={(status) => {
            setEditingItem(null);
            setItemTargetStatus(status);
            setItemDefaultDue(null);
            setItemDialogOpen(true);
          }}
          onCreateWithDate={(dateISO) => {
            setEditingItem(null);
            setItemTargetStatus("todo");
            setItemDefaultDue(dateISO);
            setItemDialogOpen(true);
          }}
          onEditItem={(item) => {
            setEditingItem(item);
            setItemDialogOpen(true);
          }}
          onAddColumn={addColumn}
          onConnectRepo={connectRepoToSpace}
          onViewRepo={(id) => selectRepo(id)}
          onPinSpace={() => togglePinSpace(activeSpace.id)}
          onDeleteSpace={() => deleteSpace(activeSpace.id)}
          onCreateBacklog={(target) => {
            setEditingItem(null);
            setItemTargetStatus(target === "sprint" ? "inprogress" : "todo");
            setItemDefaultDue(null);
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
      <WorkItemDialog
        open={itemDialogOpen}
        onOpenChange={(o) => { setItemDialogOpen(o); if (!o) setEditingItem(null); }}
        onSubmit={upsertWorkItem}
        onDelete={deleteWorkItem}
        disabled={!activeSpace}
        spaceName={activeSpace?.name ?? ""}
        epics={activeSpace?.workItems.filter((w) => w.type === "epic") ?? []}
        editing={editingItem}
        defaultDueDate={itemDefaultDue}
      />
    </AppShell>
    </IncidentProvider>
  );
}

// ─── Landing hero ────────────────────────────────────────────────────────────

function LandingHero({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  const features = [
    { icon: Kanban, title: "Boards that flow", desc: "Kanban, Scrum, bug tracking and custom boards — drag, drop, done." },
    { icon: GitBranch, title: "Repos, connected", desc: "Bring GitHub & GitLab in. Turn code and issues into work items." },
    { icon: Bot, title: "Unify Intelli", desc: "An AI teammate that understands your repos, issues and plans." },
  ];
  return (
    <>
      <header className="landing-nav">
        <div className="flex items-center gap-2">
          <div className="landing-logo">U</div>
          <span className="text-[17px] font-semibold tracking-tight text-foreground">Unify</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSignIn} className="landing-btn landing-btn--ghost">Sign In</button>
          <button onClick={onSignUp} className="landing-btn landing-btn--primary">Sign Up</button>
        </div>
      </header>

      <main className="landing-main">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="landing-hero"
        >
          <span className="landing-pill">
            <Sparkles className="h-3.5 w-3.5" /> AI-native project workspace
          </span>
          <h1 className="landing-title">
            Where your <span className="landing-title-accent">plans</span> and{" "}
            <span className="landing-title-accent">code</span> finally meet.
          </h1>
          <p className="landing-sub">
            Unify brings boards, backlogs, repositories and an AI teammate into one compact,
            seamless workspace — so your team can plan and ship without switching tabs.
          </p>
          <div className="landing-cta-row">
            <button onClick={onSignUp} className="landing-btn landing-btn--primary landing-btn--lg">
              Get started — it&apos;s free
            </button>
            <button onClick={onSignIn} className="landing-btn landing-btn--outline landing-btn--lg">
              Sign in
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="landing-features"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="landing-feature">
              <div className="landing-feature-icon"><Icon className="h-4 w-4" /></div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </>
  );
}
