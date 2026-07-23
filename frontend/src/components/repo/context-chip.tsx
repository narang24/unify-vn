"use client";

import { File, Folder, CircleDot, GitPullRequest, Code2, X } from "lucide-react";
import type { ContextChip as ContextChipData } from "@/lib/repo-types";

const ICONS = {
    file: File,
    folder: Folder,
    issue: CircleDot,
    pr: GitPullRequest,
    code: Code2,
};

export function ContextChip({ chip, onRemove }: { chip: ContextChipData; onRemove?: (id: string) => void }) {
    const Icon = ICONS[chip.type];
    return (
        <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-border-subtle bg-panel-strong/40 px-2 py-1 text-[11.5px] font-medium text-foreground">
            <Icon className="h-3 w-3 shrink-0 text-accent" />
            <span className="truncate">{chip.label}</span>
            {onRemove && (
                <button
                    onClick={() => onRemove(chip.id)}
                    className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted hover:bg-foreground/10 hover:text-foreground"
                    aria-label={`Remove ${chip.label}`}
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    );
}