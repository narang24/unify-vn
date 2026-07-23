// ─── Repository domain types (UI-only, mock data) ─────────────────────────
// NOTE: This stage wires up UI/UX only. Nothing here calls the real GitHub
// API yet — all data is seeded/mocked so the interaction model (browsing,
// context selection, chat shell) can be built and reviewed before the
// Unify Intelli agent + GitHub integration are implemented.

export type GitProvider = "github" | "gitlab";

export interface ConnectedRepository {
    id: string;
    name: string;
    fullName: string; // e.g. "narang24/unify-vn"
    provider: GitProvider;
    defaultBranch: string;
    connectedAt: string;
    avatarColor: string;
}

export interface RepoFileNode {
    path: string; // full path from repo root, e.g. "src/controllers/auth.ts"
    name: string;
    type: "file" | "folder";
    language?: string;
    children?: RepoFileNode[];
    content?: string;
}

export interface RepoBranch {
    name: string;
    isDefault?: boolean;
}

export type IssueState = "open" | "closed";

export interface GithubIssue {
    id: string;
    number: number;
    title: string;
    state: IssueState;
    author: string;
    createdAt: string;
    labels: string[];
    comments: number;
}

export interface GithubPullRequest {
    id: string;
    number: number;
    title: string;
    state: "open" | "merged" | "closed";
    author: string;
    createdAt: string;
    sourceBranch: string;
    targetBranch: string;
    comments: number;
}

// ─── Context chips (AI sidebar) ────────────────────────────────────────────

export type ContextChipType = "file" | "folder" | "issue" | "pr" | "code";

export interface ContextChip {
    id: string;
    type: ContextChipType;
    label: string;
    meta?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    contextChips?: ContextChip[];
}

// ─── Seed data ──────────────────────────────────────────────────────────────

export const SEED_REPOSITORIES: ConnectedRepository[] = [
    {
        id: "repo_unify",
        name: "unify-vn",
        fullName: "narang24/unify-vn",
        provider: "github",
        defaultBranch: "main",
        connectedAt: "3 days ago",
        avatarColor: "#3a93b1",
    },
];

export const SEED_BRANCHES: RepoBranch[] = [
    { name: "main", isDefault: true },
    { name: "develop" },
    { name: "feature/repo-workspace" },
];

export const SEED_FILE_TREE: RepoFileNode[] = [
    {
        path: "src",
        name: "src",
        type: "folder",
        children: [
            {
                path: "src/controllers",
                name: "controllers",
                type: "folder",
                children: [
                    {
                        path: "src/controllers/auth.ts",
                        name: "auth.ts",
                        type: "file",
                        language: "typescript",
                        content: `import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as { sub: string };
}

export async function signIn(email: string, password: string) {
  // TODO: look up user, compare password hash
  return { accessToken: "..." };
}
`,
                    },
                    {
                        path: "src/controllers/workspace.ts",
                        name: "workspace.ts",
                        type: "file",
                        language: "typescript",
                        content: `export async function createWorkspace(name: string, ownerId: string) {
  // insert workspace row
}
`,
                    },
                ],
            },
            {
                path: "src/routes",
                name: "routes",
                type: "folder",
                children: [
                    {
                        path: "src/routes/index.ts",
                        name: "index.ts",
                        type: "file",
                        language: "typescript",
                        content: `import { Router } from "express";
export const router = Router();
`,
                    },
                ],
            },
            {
                path: "src/index.ts",
                name: "index.ts",
                type: "file",
                language: "typescript",
                content: `import express from "express";
const app = express();
app.listen(8000);
`,
            },
        ],
    },
    {
        path: "package.json",
        name: "package.json",
        type: "file",
        language: "json",
        content: `{
  "name": "unify-vn",
  "version": "0.1.0"
}
`,
    },
    {
        path: "README.md",
        name: "README.md",
        type: "file",
        language: "markdown",
        content: `# Unify

AI-native project workspace.
`,
    },
];

export const SEED_ISSUES: GithubIssue[] = [
    {
        id: "iss_1",
        number: 42,
        title: "Refresh token rotation fails silently on expiry",
        state: "open",
        author: "narang24",
        createdAt: "2 days ago",
        labels: ["bug", "auth"],
        comments: 3,
    },
    {
        id: "iss_2",
        number: 39,
        title: "Add rate limiting to workspace creation endpoint",
        state: "open",
        author: "vnair",
        createdAt: "5 days ago",
        labels: ["enhancement"],
        comments: 1,
    },
    {
        id: "iss_3",
        number: 31,
        title: "Timeline view: weekend shading off by one on DST switch",
        state: "closed",
        author: "narang24",
        createdAt: "2 weeks ago",
        labels: ["bug", "frontend"],
        comments: 5,
    },
];

export const SEED_PULL_REQUESTS: GithubPullRequest[] = [
    {
        id: "pr_1",
        number: 51,
        title: "Add Repository Workspace UI shell",
        state: "open",
        author: "narang24",
        createdAt: "today",
        sourceBranch: "feature/repo-workspace",
        targetBranch: "main",
        comments: 0,
    },
    {
        id: "pr_2",
        number: 48,
        title: "Fix cookie domain rewrite for OAuth callbacks",
        state: "merged",
        author: "vnair",
        createdAt: "4 days ago",
        sourceBranch: "fix/oauth-cookie",
        targetBranch: "main",
        comments: 4,
    },
];

export function findFileByPath(nodes: RepoFileNode[], path: string): RepoFileNode | null {
    for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
            const found = findFileByPath(node.children, path);
            if (found) return found;
        }
    }
    return null;
}