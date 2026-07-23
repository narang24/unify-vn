"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, ListPlus } from "lucide-react";

export interface CodeSelectionInfo {
    text: string;
    top: number;
    left: number;
}

export function CodeSelectionTooltip({
    selection,
    onAddToChat,
    onCreateWorkItem,
}: {
    selection: CodeSelectionInfo | null;
    onAddToChat: (text: string) => void;
    onCreateWorkItem: (text: string) => void;
}) {
    return (
        <AnimatePresence>
            {selection && (
                <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    style={{ top: selection.top, left: selection.left }}
                    className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border-subtle bg-panel p-1 shadow-[0_12px_28px_rgba(4,25,28,0.2)]"
                >
                    <button
                        onClick={() => onAddToChat(selection.text)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-foreground hover:bg-black/5"
                    >
                        <MessageSquarePlus className="h-3.5 w-3.5 text-accent" /> Add to Chat
                    </button>
                    <div className="h-4 w-px bg-border-subtle" />
                    <button
                        onClick={() => onCreateWorkItem(selection.text)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-foreground hover:bg-black/5"
                    >
                        <ListPlus className="h-3.5 w-3.5 text-accent" /> Create Work Item
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}