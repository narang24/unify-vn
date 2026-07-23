"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { getToken, clearToken, fetchWithAuth, setToken } from "@/lib/auth";
import { toast } from "@/lib/use-toast";
import { AppShell, type ShellWorkspace } from "@/components/app-shell";
import { SpaceTopbar } from "@/components/space-topbar";
import { RepoWorkspace } from "@/components/repo/repo-workspace";
import { UnifyIntelliWorkspace } from "@/components/unify-intelli/unify-intelli-workspace";
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

  // ── Email/password auth state ────────────────────────────────────────────
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

  // ── Repositories (first-class sidebar entities) ─────────────────────────
  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);

  // ── Unify Intelli dedicated AI workspace ────────────────────────────────
  const [intelliOpen, setIntelliOpen] = useState(false);

  function openIntelliWorkspace() {
    setActiveRepoId(null);
    setIntelliOpen(true);
  }

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
    setIntelliOpen(false);
    setActiveRepoId(id);
  }

  function connectRepo(repo: ConnectedRepository) {
    setIntelliOpen(false);
    setRepositories((r) => [repo, ...r]);
    setActiveRepoId(repo.id);
    toast({ title: "Repository connected", description: repo.fullName, variant: "success" });
  }

  const activeRepo = repositories.find((r) => r.id === activeRepoId) ?? null;

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      // No token — show the login page immediately
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
        // Token invalid/expired — show the login page
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // ── Login / Signup page (shown when unauthenticated) ─────────────────────
  if (!user) {
    return (
      <div className="auth-page-root">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo-wrap">
            <div className="auth-logo-icon">U</div>
            <h1 className="auth-title">Welcome to Unify</h1>
            <p className="auth-subtitle">
              {authTab === "signin" ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              id="auth-tab-signin"
              role="tab"
              aria-selected={authTab === "signin"}
              className={`auth-tab${authTab === "signin" ? " auth-tab--active" : ""}`}
              onClick={() => { setAuthTab("signin"); setAuthError(null); }}
            >
              Sign In
            </button>
            <button
              id="auth-tab-signup"
              role="tab"
              aria-selected={authTab === "signup"}
              className={`auth-tab${authTab === "signup" ? " auth-tab--active" : ""}`}
              onClick={() => { setAuthTab("signup"); setAuthError(null); }}
            >
              Sign Up
            </button>
          </div>

          {/* Email / Password form */}
          <form id="auth-email-form" className="auth-form" onSubmit={handleEmailAuth} noValidate>
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
                  id="auth-toggle-password"
                  className="auth-eye-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <p className="auth-error" role="alert">{authError}</p>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={authLoading}
            >
              {authLoading ? (
                <span className="auth-spinner" />
              ) : authTab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <span className="auth-divider-line" />
          </div>

          {/* OAuth buttons */}
          <div className="auth-oauth-row">
            <a
              id="auth-oauth-github"
              href={`${apiBase2}/api/v1/auth/oauth/github`}
              className="auth-oauth-btn"
              title="Continue with GitHub"
            >
              <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>

            <a
              id="auth-oauth-google"
              href={`${apiBase2}/api/v1/auth/oauth/google`}
              className="auth-oauth-btn"
              title="Continue with Google"
            >
              <svg className="auth-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </a>

            <a
              id="auth-oauth-gitlab"
              href={`${apiBase2}/api/v1/auth/oauth/gitlab`}
              className="auth-oauth-btn"
              title="Continue with GitLab"
            >
              <svg className="auth-oauth-icon" viewBox="0 0 24 24" fill="#FC6D26" aria-hidden="true">
                <path d="M4.845.904a.93.93 0 0 0-.888.63L.108 11.854a1.307 1.307 0 0 0 .474 1.46L12 22.096l11.418-8.782a1.307 1.307 0 0 0 .474-1.46L20.044 1.534a.93.93 0 0 0-.888-.63.93.93 0 0 0-.888.63l-2.552 7.85H8.284L5.732 1.534A.93.93 0 0 0 4.845.904z" />
              </svg>
              <span>GitLab</span>
            </a>
          </div>

          <p className="auth-terms">
            By signing in you agree to our{" "}
            <a href="#" className="auth-terms-link">terms of service</a>.
          </p>
        </div>
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
      activeSpaceId={activeRepo || intelliOpen ? null : activeSpace?.id ?? null}
      onSelectWorkspace={(id) => {
        setIntelliOpen(false);
        setActiveRepoId(null);
        setActiveWorkspaceId(id);
        setActiveSpaceId(null);
      }}
      onSelectSpace={(id) => {
        setIntelliOpen(false);
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
      onOpenIntelli={openIntelliWorkspace}
      intelliActive={intelliOpen}
      user={user}
      onSignOut={handleSignOut}
    >
      {intelliOpen ? (
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