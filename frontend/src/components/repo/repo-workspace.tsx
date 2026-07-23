"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, CircleDot, GitPullRequest, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeView } from "@/components/repo/code-view";
import { IssuesView } from "@/components/repo/issues-view";
import { PullRequestsView } from "@/components/repo/pull-requests-view";
import { AiSidebar } from "@/components/repo/ai-sidebar";
import { CreateWorkItemDialog } from "@/components/create-work-item-dialog";
import type { ConnectedRepository, ContextChip } from "@/lib/repo-types";
import type { WorkItemType } from "@/lib/work-item-types";

type RepoTab = "code" | "issues" | "prs";

const TABS: { id: RepoTab; label: string; icon: typeof Code2 }[] = [
    { id: "code", label: "Code", icon: Code2 },
    { id: "issues", label: "Issues", icon: CircleDot },
    { id: "prs", label: "Pull Requests", icon: GitPullRequest },
];

export function RepoWorkspace({
    repo,
    onCreateWorkItem,
}: {
    repo: ConnectedRepository;
    onCreateWorkItem: (title: string, type: WorkItemType) => void;
}) {
    const [activeTab, setActiveTab] = useState<RepoTab>("code");
    const [aiOpen, setAiOpen] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [contextChips, setContextChips] = useState<ContextChip[]>([]);
    const [workItemDialogOpen, setWorkItemDialogOpen] = useState(false);
    const [linkedSnippet, setLinkedSnippet] = useState<{ text: string; path: string } | null>(null);

    function addChip(chip: ContextChip) {
        setContextChips((c) => (c.find((x) => x.id === chip.id) ? c : [...c, chip]));
    }
    function removeChip(id: string) {
        setContextChips((c) => c.filter((x) => x.id !== id));
    }

    function addCodeToChat(snippet: string, path: string) {
        addChip({ id: `ctx_code_${Date.now()}`, type: "code", label: `${path.split("/").pop()} snippet`, meta: snippet });
        setAiOpen(true);
    }

    function createWorkItemFromCode(snippet: string, path: string) {
        setLinkedSnippet({ text: snippet, path });
        setWorkItemDialogOpen(true);
    }

    return (
        <div className="flex h-full">
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Repo header */}
                <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-5 pt-3 pb-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
                        {repo.name[0]?.toUpperCase()}
                    </div>
                    <h1 className="truncate text-[15px] font-semibold text-foreground">{repo.name}</h1>
                    <span className="hidden text-[12px] text-muted sm:inline">· {repo.fullName}</span>

                    <button
                        onClick={() => setAiOpen((o) => !o)}
                        className={cn(
                            "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                            aiOpen ? "bg-accent text-white" : "bg-accent/10 text-accent hover:bg-accent/20",
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5" /> Ask Unify Intelli
                    </button>
                </div>

                {/* Repo nav */}
                <div className="flex items-end gap-0.5 border-b border-border-subtle bg-panel px-4">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12.5px] font-medium whitespace-nowrap",
                                    isActive ? "text-accent" : "text-muted hover:text-foreground",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="repo-tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                <div className="min-h-0 flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
                        >
                            {activeTab === "code" && (
                                <CodeView
                                    repo={repo}
                                    selectMode={selectMode}
                                    selectedChips={contextChips}
                                    onAddChip={addChip}
                                    onRemoveChip={removeChip}
                                    onAddCodeToChat={addCodeToChat}
                                    onCreateWorkItemFromCode={createWorkItemFromCode}
                                />
                            )}
                            {activeTab === "issues" && (
                                <IssuesView selectMode={selectMode} selectedChips={contextChips} onAddChip={addChip} onRemoveChip={removeChip} />
                            )}
                            {activeTab === "prs" && (
                                <PullRequestsView selectMode={selectMode} selectedChips={contextChips} onAddChip={addChip} onRemoveChip={removeChip} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <AiSidebar
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                repoName={repo.name}
                selectMode={selectMode}
                onToggleSelectMode={() => setSelectMode((s) => !s)}
                contextChips={contextChips}
                onRemoveChip={removeChip}
            />

            <CreateWorkItemDialog
                open={workItemDialogOpen}
                onOpenChange={(o) => {
                    setWorkItemDialogOpen(o);
                    if (!o) setLinkedSnippet(null);
                }}
                onCreate={(title, type) => {
                    onCreateWorkItem(title, type);
                    setLinkedSnippet(null);
                }}
                linkedSnippet={linkedSnippet}
            />
        </div>
    );
}