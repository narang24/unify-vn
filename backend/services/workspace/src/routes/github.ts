import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.js";
import { repositories, users } from "../../../../src/db/schema.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { cached } from "../../../../src/lib/redis.js";

export const githubRouter = Router();
githubRouter.use(requireAuth);

const GH = "https://api.github.com";

async function tokenFor(userId: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user?.githubAccessToken ?? null;
}

async function repoFullName(repoId: string): Promise<string | null> {
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId));
  return repo?.fullName ?? null;
}

async function gh<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GH}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Ensures the user has a GitHub token; returns it or writes a 409 and returns null. */
async function requireGithub(req: AuthedRequest, res: import("express").Response): Promise<string | null> {
  const token = await tokenFor(req.userId!);
  if (!token) {
    res.status(409).json({ error: "github_not_connected", message: "Sign in with GitHub to browse repository data." });
    return null;
  }
  return token;
}

// ─── Nested tree builder (GitHub flat tree → frontend RepoFileNode shape) ─────

interface FileNode {
  path: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

function buildTree(items: { path: string; type: string }[]): FileNode[] {
  const root: FileNode = { path: "", name: "", type: "folder", children: [] };
  const dirIndex = new Map<string, FileNode>([["", root]]);

  const ensureDir = (dirPath: string): FileNode => {
    if (dirIndex.has(dirPath)) return dirIndex.get(dirPath)!;
    const parentPath = dirPath.includes("/") ? dirPath.slice(0, dirPath.lastIndexOf("/")) : "";
    const parent = ensureDir(parentPath);
    const node: FileNode = { path: dirPath, name: dirPath.split("/").pop()!, type: "folder", children: [] };
    parent.children!.push(node);
    dirIndex.set(dirPath, node);
    return node;
  };

  for (const item of items) {
    if (item.type === "tree") {
      ensureDir(item.path);
    } else {
      const parentPath = item.path.includes("/") ? item.path.slice(0, item.path.lastIndexOf("/")) : "";
      ensureDir(parentPath).children!.push({ path: item.path, name: item.path.split("/").pop()!, type: "file" });
    }
  }

  const sort = (nodes: FileNode[]): FileNode[] =>
    nodes
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));

  return sort(root.children ?? []);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/v1/github/repos — the signed-in user's repositories
githubRouter.get("/github/repos", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  try {
    const repos = await cached(`gh:repos:${req.userId}`, 300, () =>
      gh<any[]>(token, "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member"),
    );
    res.json({
      repos: repos.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        provider: "github",
        defaultBranch: r.default_branch,
        htmlUrl: r.html_url,
        private: r.private,
        description: r.description,
        language: r.language,
      })),
    });
  } catch (err) {
    console.error("[github.repos]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/tree?ref=
githubRouter.get("/repositories/:id/tree", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  const ref = (req.query.ref as string) || "HEAD";
  try {
    const data = await cached(`gh:tree:${full}:${ref}`, 300, () =>
      gh<{ tree: { path: string; type: string }[] }>(token, `/repos/${full}/git/trees/${ref}?recursive=1`),
    );
    res.json({ tree: buildTree(data.tree ?? []) });
  } catch (err) {
    console.error("[github.tree]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/file?path=&ref=
githubRouter.get("/repositories/:id/file", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  const path = req.query.path as string;
  if (!path) return res.status(400).json({ error: "path is required" });
  const ref = (req.query.ref as string) || "";
  try {
    const data = await gh<{ content?: string; encoding?: string; name: string }>(
      token,
      `/repos/${full}/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ""}`,
    );
    const content = data.content && data.encoding === "base64" ? Buffer.from(data.content, "base64").toString("utf-8") : "";
    res.json({ path, name: data.name, content });
  } catch (err) {
    console.error("[github.file]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/issues
githubRouter.get("/repositories/:id/issues", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  try {
    const data = await cached(`gh:issues:${full}`, 120, () =>
      gh<any[]>(token, `/repos/${full}/issues?state=all&per_page=50`),
    );
    res.json({
      issues: data
        .filter((i) => !i.pull_request)
        .map((i) => ({
          id: String(i.id),
          number: i.number,
          title: i.title,
          state: i.state,
          author: i.user?.login,
          createdAt: i.created_at,
          labels: (i.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
          comments: i.comments,
        })),
    });
  } catch (err) {
    console.error("[github.issues]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/pulls
githubRouter.get("/repositories/:id/pulls", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  try {
    const data = await cached(`gh:pulls:${full}`, 120, () =>
      gh<any[]>(token, `/repos/${full}/pulls?state=all&per_page=50`),
    );
    res.json({
      pulls: data.map((p) => ({
        id: String(p.id),
        number: p.number,
        title: p.title,
        state: p.merged_at ? "merged" : p.state,
        author: p.user?.login,
        createdAt: p.created_at,
        sourceBranch: p.head?.ref,
        targetBranch: p.base?.ref,
        comments: p.comments ?? 0,
      })),
    });
  } catch (err) {
    console.error("[github.pulls]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/branches
githubRouter.get("/repositories/:id/branches", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  try {
    const data = await cached(`gh:branches:${full}`, 300, () =>
      gh<any[]>(token, `/repos/${full}/branches?per_page=100`),
    );
    res.json({ branches: data.map((b) => ({ name: b.name, protected: b.protected, sha: b.commit?.sha })) });
  } catch (err) {
    console.error("[github.branches]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});

// GET /api/v1/repositories/:id/commits?sha=
githubRouter.get("/repositories/:id/commits", async (req: AuthedRequest, res) => {
  const token = await requireGithub(req, res);
  if (!token) return;
  const full = await repoFullName(req.params.id as string);
  if (!full) return res.status(404).json({ error: "Repository not found" });
  const sha = (req.query.sha as string) || "";
  try {
    const data = await cached(`gh:commits:${full}:${sha}`, 120, () =>
      gh<any[]>(token, `/repos/${full}/commits?per_page=30${sha ? `&sha=${sha}` : ""}`),
    );
    res.json({
      commits: data.map((c) => ({
        sha: c.sha,
        shortSha: c.sha?.slice(0, 7),
        message: c.commit?.message?.split("\n")[0],
        author: c.commit?.author?.name ?? c.author?.login,
        date: c.commit?.author?.date,
        avatarUrl: c.author?.avatar_url,
      })),
    });
  } catch (err) {
    console.error("[github.commits]", err);
    res.status(502).json({ error: "GitHub request failed" });
  }
});
