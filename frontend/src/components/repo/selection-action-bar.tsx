"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, ListPlus, X } from "lucide-react";

export function SelectionActionBar({
  count,
  onAddToChat,
  onCreateWorkItem,
  onClear,
}: {
  count: number;
  onAddToChat: () => void;
  onCreateWorkItem: () => void;
  onClear?: () => void;
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "tween", duration: 0.16, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3"
        >
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-[#101828] px-3 py-2 text-white shadow-[0_18px_40px_rgba(4,25,28,0.35)]">
            <span className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap">
              {count} selected
            </span>
            <div className="h-4 w-px bg-white/15" />
            <button
              onClick={onAddToChat}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[12.5px] font-medium text-white/90 hover:bg-white/10"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" /> Add to Chat
            </button>
            <button
              onClick={onCreateWorkItem}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[12.5px] font-medium text-white/90 hover:bg-white/10"
            >
              <ListPlus className="h-3.5 w-3.5" /> Create Work Item
            </button>
            {onClear && (
              <>
                <div className="h-4 w-px bg-white/15" />
                <button
                  onClick={onClear}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Clear selection"
                  title="Clear selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
