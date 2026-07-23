"use client";

import { useRef, useState } from "react";
import { ChevronRight, GitBranch, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileTree } from "@/components/repo/file-tree";
import { CodeSelectionTooltip, type CodeSelectionInfo } from "@/components/repo/code-selection-tooltip";
import type { ConnectedRepository, ContextChip, RepoFileNode } from "@/lib/repo-types";
import { SEED_BRANCHES, SEED_FILE_TREE } from "@/lib/repo-types";

export function CodeView({
    repo,
    selectMode,
    selectedChips,
    onAddChip,
    onRemoveChip,
    onAddCodeToChat,
    onCreateWorkItemFromCode,
}: {
    repo: ConnectedRepository;
    selectMode: boolean;
    selectedChips: ContextChip[];
    onAddChip: (chip: ContextChip) => void;
    onRemoveChip: (id: string) => void;
    onAddCodeToChat: (snippet: string, path: string) => void;
    onCreateWorkItemFromCode: (snippet: string, path: string) => void;
}) {
    const [branch, setBranch] = useState(repo.defaultBranch);
    const [activeFile, setActiveFile] = useState<RepoFileNode | null>(
        findFirstFile(SEED_FILE_TREE),
    );
    const [selection, setSelection] = useState<CodeSelectionInfo | null>(null);
    const codeRef = useRef<HTMLPreElement>(null);

    const selectedPaths = new Set(
        selectedChips.filter((c) => c.type === "file" || c.type === "folder").map((c) => c.meta ?? c.label),
    );

    function toggleSelect(node: RepoFileNode) {
        const already = selectedPaths.has(node.path);
        if (already) {
            const chip = selectedChips.find((c) => (c.meta ?? c.label) === node.path);
            if (chip) onRemoveChip(chip.id);
        } else {
            onAddChip({
                id: `ctx_${node.path}`,
                type: node.type === "folder" ? "folder" : "file",
                label: node.name,
                meta: node.path,
            });
        }
    }

    function handleMouseUp() {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || !codeRef.current) {
            setSelection(null);
            return;
        }
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({ text, top: rect.top - 44, left: Math.max(8, rect.left) });
    }

    const breadcrumbParts = activeFile ? [repo.name, ...activeFile.path.split("/")] : [repo.name];

    return (
        <div className="flex h-full">
            {/* File tree */}
            <div className="w-64 shrink-0 overflow-y-auto scroll-thin border-r border-border-subtle bg-panel p-2">
                <FileTree
                    nodes={SEED_FILE_TREE}
                    activePath={activeFile?.path ?? null}
                    onSelectFile={setActiveFile}
                    selectMode={selectMode}
                    selectedPaths={selectedPaths}
                    onToggleSelect={toggleSelect}
                />
            </div>

            {/* Code panel */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Toolbar: branch selector + breadcrumb */}
                <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-3 py-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <button className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2 py-1 text-[12px] font-medium hover:bg-foreground/[0.06]">
                                <GitBranch className="h-3.5 w-3.5 text-accent" />
                                {branch}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {SEED_BRANCHES.map((b) => (
                                <DropdownMenuItem key={b.name} onClick={() => setBranch(b.name)}>
                                    {branch === b.name && <Check className="h-3.5 w-3.5 text-accent" />}
                                    <span className={branch === b.name ? "font-medium text-accent" : ""}>{b.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="mx-1 h-4 w-px bg-border-subtle" />

                    <div className="flex min-w-0 items-center gap-1 overflow-x-auto scroll-thin text-[12.5px]">
                        {breadcrumbParts.map((part, i) => (
                            <span key={i} className="flex shrink-0 items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3 w-3 text-muted" />}
                                <span className={i === breadcrumbParts.length - 1 ? "font-medium text-foreground" : "text-muted"}>
                                    {part}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Code */}
                <div className="relative flex-1 overflow-auto scroll-thin bg-panel">
                    {activeFile ? (
                        <pre
                            ref={codeRef}
                            onMouseUp={handleMouseUp}
                            className="min-h-full whitespace-pre p-4 text-[12.5px] leading-relaxed text-foreground selection:bg-accent/25"
                        >
                            <code>{activeFile.content ?? "// Empty file"}</code>
                        </pre>
                    ) : (
                        <div className="flex h-full items-center justify-center text-[13px] text-muted">
                            Select a file to view its contents.
                        </div>
                    )}

                    <CodeSelectionTooltip
                        selection={selection}
                        onAddToChat={(text) => {
                            onAddCodeToChat(text, activeFile?.path ?? "");
                            setSelection(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                        onCreateWorkItem={(text) => {
                            onCreateWorkItemFromCode(text, activeFile?.path ?? "");
                            setSelection(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function findFirstFile(nodes: RepoFileNode[]): RepoFileNode | null {
    for (const node of nodes) {
        if (node.type === "file") return node;
        if (node.children) {
            const found = findFirstFile(node.children);
            if (found) return found;
        }
    }
    return null;
}