"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, CircleDot, GitPullRequest, GitCommit, Rocket, Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeView } from "@/components/repo/code-view";
import { IssuesView } from "@/components/repo/issues-view";
import { PullRequestsView } from "@/components/repo/pull-requests-view";
import { CommitsView } from "@/components/repo/commits-view";
import { DeploymentsView } from "@/components/repo/deployments-view";
import { AiSidebar } from "@/components/repo/ai-sidebar";
import { SelectionActionBar } from "@/components/repo/selection-action-bar";
import { WorkItemDialog } from "@/components/create-work-item-dialog";
import type { ConnectedRepository, ContextChip } from "@/lib/repo-types";
import type { WorkItemType, WorkItemAttachment } from "@/lib/work-item-types";

type RepoTab = "code" | "issues" | "prs" | "commits" | "deployments";

const TABS: { id: RepoTab; label: string; icon: typeof Code2 }[] = [
    { id: "code", label: "Code", icon: Code2 },
    { id: "issues", label: "Issues", icon: CircleDot },
    { id: "prs", label: "Pull Requests", icon: GitPullRequest },
    { id: "commits", label: "Commits", icon: GitCommit },
    { id: "deployments", label: "Deployments", icon: Rocket },
];

export function RepoWorkspace({
    repo,
    onCreateWorkItem,
    onOpenIntelliWorkspace,
}: {
    repo: ConnectedRepository;
    onCreateWorkItem: (title: string, type: WorkItemType, attachments?: WorkItemAttachment[]) => void;
    onOpenIntelliWorkspace?: () => void;
}) {
    const [activeTab, setActiveTab] = useState<RepoTab>("code");
    const [aiOpen, setAiOpen] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [contextChips, setContextChips] = useState<ContextChip[]>([]);
    const [workItemDialogOpen, setWorkItemDialogOpen] = useState(false);
    const [linkedSnippet, setLinkedSnippet] = useState<{ text: string; path: string } | null>(null);

    const owner = repo.fullName.split("/")[0];

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

    function exitSelectMode() {
        setSelectMode(false);
        setContextChips([]);
    }

    function openWorkItemFromSelection() {
        setLinkedSnippet(null);
        setWorkItemDialogOpen(true);
    }

    return (
        <div className="flex h-full">
            <div className="relative flex min-w-0 flex-1 flex-col">
                {/* Repo header */}
                <div className="flex items-center gap-2 border-b border-border-subtle bg-panel px-3 pt-3 pb-2 sm:px-5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
                        {repo.name[0]?.toUpperCase()}
                    </div>
                    <h1 className="truncate text-[15px] font-semibold text-foreground">{repo.name}</h1>

                    {/* Owner avatar + owner/repo */}
                    <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
                        <span className="text-[12px] text-muted">·</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://github.com/${owner}.png`}
                            alt={owner}
                            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/5"
                        />
                        <span className="truncate text-[12px] text-muted">{repo.fullName}</span>
                    </div>

                    <AnimatePresence>
                        {!aiOpen && (
                            <motion.button
                                key="ask-intelli"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setAiOpen(true)}
                                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[12.5px] font-medium text-accent hover:bg-accent/20"
                            >
                                <Lightbulb className="h-3.5 w-3.5" /> Ask Unify Intelli
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Repo nav */}
                <div className="flex items-end gap-0.5 border-b border-border-subtle bg-panel px-2 sm:px-4">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative flex items-center gap-1.5 rounded-t-lg px-2.5 py-2 text-[12.5px] font-medium whitespace-nowrap sm:px-3",
                                    isActive ? "text-accent" : "text-muted hover:text-foreground",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{tab.label}</span>
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

                    {/* Select / Cancel — right-aligned in the nav row */}
                    <div className="ml-auto flex items-center py-1.5">
                        {selectMode ? (
                            <button
                                onClick={exitSelectMode}
                                className="flex items-center gap-1 rounded-md bg-danger/10 px-2.5 py-1 text-[12px] font-medium text-danger hover:bg-danger/20"
                            >
                                <X className="h-3 w-3" /> Cancel
                            </button>
                        ) : (
                            <button
                                onClick={() => setSelectMode(true)}
                                className="rounded-md px-2.5 py-1 text-[12px] font-medium text-muted hover:bg-foreground/[0.06] hover:text-foreground"
                            >
                                Select
                            </button>
                        )}
                    </div>
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
                                <IssuesView repo={repo} selectMode={selectMode} selectedChips={contextChips} onAddChip={addChip} onRemoveChip={removeChip} />
                            )}
                            {activeTab === "prs" && (
                                <PullRequestsView repo={repo} selectMode={selectMode} selectedChips={contextChips} onAddChip={addChip} onRemoveChip={removeChip} />
                            )}
                            {activeTab === "commits" && <CommitsView repo={repo} />}
                            {activeTab === "deployments" && (
                                <DeploymentsView
                                    repo={repo}
                                    onAskIntelli={(rca) => {
                                        if (rca) {
                                            addChip({
                                                id: `ctx_rca_${rca.deploymentId}`,
                                                type: "code",
                                                label: `RCA: ${rca.classification.category}`,
                                                meta: `${rca.rootCause}\n\nRecommended fix:\n${rca.recommendedFix}`,
                                            });
                                        }
                                        setAiOpen(true);
                                    }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Jira-style floating selection action bar */}
                <SelectionActionBar
                    count={contextChips.length}
                    onAddToChat={() => setAiOpen(true)}
                    onCreateWorkItem={openWorkItemFromSelection}
                    onClear={exitSelectMode}
                />
            </div>

            <AiSidebar
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                repoName={repo.name}
                selectMode={selectMode}
                onToggleSelectMode={() => setSelectMode((s) => !s)}
                contextChips={contextChips}
                onRemoveChip={removeChip}
                onOpenFullWorkspace={onOpenIntelliWorkspace}
            />

            <WorkItemDialog
                open={workItemDialogOpen}
                onOpenChange={(o) => {
                    setWorkItemDialogOpen(o);
                    if (!o) setLinkedSnippet(null);
                }}
                onSubmit={(payload) => {
                    onCreateWorkItem(payload.title, payload.type, payload.attachments);
                    setLinkedSnippet(null);
                }}
                spaceName={repo.name}
                linkedSnippet={linkedSnippet}
                presetAttachments={
                    !linkedSnippet
                        ? contextChips.map((c) => ({ id: c.id, name: c.label, meta: c.type }))
                        : undefined
                }
            />
        </div>
    );
}
