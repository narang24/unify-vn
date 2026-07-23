"use client";

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getToken, clearToken, fetchWithAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WorkItemType = "epic" | "story" | "task" | "subtask" | "bug" | "custom";

type WorkItem = {
  id: string;
  title: string;
  type: WorkItemType;
  status: string; // column id
  assignee?: string;
  dueDate?: string | null;
};

type Space = {
  id: string;
  name: string;
  boardColumns: string[]; // column ids in order
  workItems: WorkItem[];
};

type Workspace = {
  id: string;
  name: string;
  spaces: Space[];
};

const STORAGE_KEY = "unify.mock.workspaces.v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string | null; email: string; authProvider: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => workspaces[0]?.id ?? null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(() => workspaces[0]?.spaces?.[0]?.id ?? null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";
    fetchWithAuth(`${apiUrl}/api/v1/auth/me`)
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
  }, [router]);

  useEffect(() => {
    // keep local cache for offline fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
    } catch {}
  }, [workspaces]);

  // --- API integration ---
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

  const seededFallback = (): Workspace[] => [
    {
      id: uid("ws"),
      name: "Default Workspace",
      spaces: [
        {
          id: uid("sp"),
          name: "My Kanban Space",
          boardColumns: ["todo", "inprogress", "inreview", "done"],
          workItems: [
            { id: uid("wi"), title: "Bug Resolver", type: "bug", status: "inprogress", assignee: "VN", dueDate: "2026-07-23" },
          ],
        },
      ],
    },
  ];

  async function fetchWorkspaces() {
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/workspaces`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setWorkspaces(data.workspaces ?? []);
      if (data.workspaces?.[0]) {
        setActiveWorkspaceId(data.workspaces[0].id);
      }
    } catch (err) {
      // fallback to local cache or seeded
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Workspace[];
          setWorkspaces(parsed);
          setActiveWorkspaceId(parsed[0]?.id ?? null);
          return;
        }
      } catch {}
      setWorkspaces(seededFallback());
      setActiveWorkspaceId((s) => s ?? seededFallback()[0].id);
    }
  }

  async function fetchSpaces(workspaceId: string) {
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/workspaces/${workspaceId}/spaces`);
      if (!res.ok) throw new Error("Failed to fetch spaces");
      const data = await res.json();
      setWorkspaces((all) => all.map((w) => (w.id === workspaceId ? { ...w, spaces: data.spaces ?? [] } : w)));
      setActiveSpaceId((prev) => prev ?? data.spaces?.[0]?.id ?? null);
    } catch (err) {
      // ignore — keep existing
    }
  }

  async function fetchWorkItems(spaceId: string) {
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/spaces/${spaceId}/work_items`);
      if (!res.ok) throw new Error("Failed to fetch work items");
      const data = await res.json();
      setWorkspaces((all) =>
        all.map((w) => ({
          ...w,
          spaces: w.spaces.map((s) => (s.id === spaceId ? { ...s, workItems: data.workItems ?? [] } : s)),
        })),
      );
    } catch (err) {
      // ignore fallback
    }
  }

  async function createWorkspace() {
    const name = window.prompt("Workspace name")?.trim();
    if (!name) return;
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      await fetchWorkspaces();
    } catch (err) {
      // fallback locally
      const ws: Workspace = { id: uid("ws"), name, spaces: [] };
      setWorkspaces((s) => [ws, ...s]);
      setActiveWorkspaceId(ws.id);
      setActiveSpaceId(null);
    }
  }

  async function createSpace() {
    if (!activeWorkspaceId) return alert("Select a workspace first");
    const name = window.prompt("Space name")?.trim();
    if (!name) return;
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/workspaces/${activeWorkspaceId}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: "kanban" }),
      });
      if (!res.ok) throw new Error("Failed to create space");
      await fetchSpaces(activeWorkspaceId);
    } catch (err) {
      // fallback local
      setWorkspaces((all) =>
        all.map((ws) => (ws.id === activeWorkspaceId ? { ...ws, spaces: [{ id: uid("sp"), name, boardColumns: ["todo", "inprogress", "inreview", "done"], workItems: [] }, ...ws.spaces] } : ws)),
      );
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      setActiveSpaceId(ws?.spaces?.[0]?.id ?? null);
    }
  }

  async function createWorkItem(type: WorkItemType = "task") {
    if (!activeWorkspaceId || !activeSpaceId) return alert("Select a space first");
    const title = window.prompt("Work item title")?.trim();
    if (!title) return;
    try {
      const res = await fetchWithAuth(`${apiBase}/api/v1/spaces/${activeSpaceId}/work_items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, status: "todo" }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchWorkItems(activeSpaceId);
    } catch (err) {
      // fallback local
      setWorkspaces((all) =>
        all.map((ws) =>
          ws.id !== activeWorkspaceId
            ? ws
            : {
                ...ws,
                spaces: ws.spaces.map((sp) => (sp.id !== activeSpaceId ? sp : { ...sp, workItems: [{ id: uid("wi"), title, type, status: "todo" }, ...sp.workItems] })),
              },
        ),
      );
    }
  }

  async function moveWorkItem(itemId: string, toStatus: string) {
    // optimistic update
    setWorkspaces((all) =>
      all.map((ws) => ({
        ...ws,
        spaces: ws.spaces.map((sp) => ({
          ...sp,
          workItems: sp.workItems.map((wi) => (wi.id === itemId ? { ...wi, status: toStatus } : wi)),
        })),
      })),
    );
    try {
      await fetchWithAuth(`${apiBase}/api/v1/work_items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
    } catch {
      // ignore
    }
  }

  // Fetch initial data
  useEffect(() => {
    (async () => {
      await fetchWorkspaces();
    })();
  }, []);

  // When active workspace changes, fetch its spaces
  useEffect(() => {
    if (activeWorkspaceId) fetchSpaces(activeWorkspaceId);
  }, [activeWorkspaceId]);

  // When active space changes, fetch its work items
  useEffect(() => {
    if (activeSpaceId) fetchWorkItems(activeSpaceId);
  }, [activeSpaceId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const activeSpace = activeWorkspace?.spaces?.find((s) => s.id === activeSpaceId) ?? activeWorkspace?.spaces?.[0];

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-subtle bg-panel p-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[color:var(--accent)] text-white flex items-center justify-center font-semibold">U</div>
            <div className="font-semibold">Unify</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => createWorkspace()}>
            +
          </Button>
        </div>

        <div className="mt-4">
          <div className="mb-2 px-2 text-xs font-semibold text-muted">Workspaces</div>
          <div className="space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActiveWorkspaceId(ws.id);
                  setActiveSpaceId(ws.spaces?.[0]?.id ?? null);
                }}
                className={`w-full text-left rounded-md px-2 py-2 hover:bg-white/40 ${ws.id === activeWorkspaceId ? "bg-white/60" : ""}`}>
                {ws.name}
              </button>
            ))}
          </div>

          <div className="mt-4 mb-2 px-2 text-xs font-semibold text-muted">Spaces</div>
          <div className="space-y-1">
            {(activeWorkspace?.spaces ?? []).map((sp) => (
              <button
                key={sp.id}
                onClick={() => setActiveSpaceId(sp.id)}
                className={`w-full text-left rounded-md px-2 py-2 hover:bg-white/40 ${sp.id === activeSpaceId ? "bg-white/60" : ""}`}>
                {sp.name}
              </button>
            ))}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => createSpace()}>
                + Create space
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-border-subtle bg-panel p-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{activeSpace?.name ?? "No Space selected"}</h2>
            <div className="text-sm text-muted">{activeWorkspace?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => createWorkItem("story")}>+ Create</Button>
            <Button variant="ghost" onClick={() => { clearToken(); router.replace("/"); }}>Sign out</Button>
          </div>
        </header>

        {/* Board */}
        <main className="flex-1 overflow-auto p-4">
          {!activeSpace ? (
            <div className="max-w-2xl">
              <Card className="p-6">Select or create a space to get started.</Card>
            </div>
          ) : (
            <div className="flex gap-4">
              {(activeSpace.boardColumns ?? ["todo", "inprogress", "inreview", "done"]).map((colId) => (
                <div key={colId} className="w-72">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">{colId === "todo" ? "To Do" : colId === "inprogress" ? "In Progress" : colId === "inreview" ? "In Review" : "Done"}</div>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {(activeSpace.workItems ?? []).filter((wi) => wi.status === colId).map((wi) => (
                        <motion.div key={wi.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-lg border border-border-subtle bg-panel p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{wi.title}</div>
                              <div className="mt-2 text-xs text-muted">{wi.type}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs text-muted">{wi.dueDate ?? ""}</div>
                              <div className="flex gap-1">
                                {(activeSpace.boardColumns ?? ["todo", "inprogress", "inreview", "done"]).map((to) => (
                                  to === wi.status ? null : (
                                    <button key={to} onClick={() => moveWorkItem(wi.id, to)} className="text-xs rounded-md bg-[rgba(0,0,0,0.04)] px-2 py-1">→</button>
                                  )
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div>
                      <Button variant="outline" size="sm" onClick={() => createWorkItem("task")}>
                        + Create
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
