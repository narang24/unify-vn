"use client";

import { useState } from "react";
import { ChevronRight, Folder, FileCode2, FileText, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepoFileNode } from "@/lib/repo-types";

function iconFor(node: RepoFileNode) {
    if (node.type === "folder") return Folder;
    if (node.language === "json") return FileJson;
    if (node.language === "markdown") return FileText;
    return FileCode2;
}

export function FileTree({
    nodes,
    activePath,
    onSelectFile,
    selectMode,
    selectedPaths,
    onToggleSelect,
    depth = 0,
}: {
    nodes: RepoFileNode[];
    activePath: string | null;
    onSelectFile: (node: RepoFileNode) => void;
    selectMode: boolean;
    selectedPaths: Set<string>;
    onToggleSelect: (node: RepoFileNode) => void;
    depth?: number;
}) {
    return (
        <div>
            {nodes.map((node) => (
                <TreeRow
                    key={node.path}
                    node={node}
                    activePath={activePath}
                    onSelectFile={onSelectFile}
                    selectMode={selectMode}
                    selectedPaths={selectedPaths}
                    onToggleSelect={onToggleSelect}
                    depth={depth}
                />
            ))}
        </div>
    );
}

function TreeRow({
    node,
    activePath,
    onSelectFile,
    selectMode,
    selectedPaths,
    onToggleSelect,
    depth,
}: {
    node: RepoFileNode;
    activePath: string | null;
    onSelectFile: (node: RepoFileNode) => void;
    selectMode: boolean;
    selectedPaths: Set<string>;
    onToggleSelect: (node: RepoFileNode) => void;
    depth: number;
}) {
    const [open, setOpen] = useState(depth < 1);
    const Icon = iconFor(node);
    const isActive = node.path === activePath;
    const isChecked = selectedPaths.has(node.path);

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] hover:bg-foreground/[0.06]",
                    isActive && "bg-accent/10 text-accent",
                )}
                style={{ paddingLeft: depth * 14 + 6 }}
            >
                {selectMode && (
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelect(node)}
                        className="mr-0.5 h-3 w-3 shrink-0 accent-[color:var(--accent)]"
                    />
                )}
                {node.type === "folder" ? (
                    <button className="flex flex-1 items-center gap-1 truncate text-left" onClick={() => setOpen((o) => !o)}>
                        <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted transition-transform", open && "rotate-90")} />
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="truncate">{node.name}</span>
                    </button>
                ) : (
                    <button className="flex flex-1 items-center gap-1 truncate pl-4 text-left" onClick={() => onSelectFile(node)}>
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="truncate">{node.name}</span>
                    </button>
                )}
            </div>

            {node.type === "folder" && open && node.children && (
                <FileTree
                    nodes={node.children}
                    activePath={activePath}
                    onSelectFile={onSelectFile}
                    selectMode={selectMode}
                    selectedPaths={selectedPaths}
                    onToggleSelect={onToggleSelect}
                    depth={depth + 1}
                />
            )}
        </div>
    );
}