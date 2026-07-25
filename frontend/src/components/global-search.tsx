"use client";

import * as React from "react";
import { Search, SquareArrowOutUpRight, Layers3, Kanban, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BoardCapsule } from "@/components/ui/board-capsule";
import type { ShellWorkspace, ShellSpace } from "@/components/app-shell";

interface SearchResult {
  type: "space" | "workspace";
  id: string;
  label: string;
  workspaceName?: string;
  kind?: ShellSpace["kind"];
}

interface GlobalSearchProps {
  workspaces: ShellWorkspace[];
  onSelectSpace: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
}

export function GlobalSearch({ workspaces, onSelectSpace, onSelectWorkspace }: GlobalSearchProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results: SearchResult[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    for (const ws of workspaces) {
      if (ws.name.toLowerCase().includes(q)) {
        out.push({ type: "workspace", id: ws.id, label: ws.name });
      }
      for (const sp of ws.spaces) {
        // match on space name OR board kind
        if (
          sp.name.toLowerCase().includes(q) ||
          sp.kind.toLowerCase().includes(q)
        ) {
          out.push({
            type: "space",
            id: sp.id,
            label: sp.name,
            workspaceName: ws.name,
            kind: sp.kind,
          });
        }
      }
    }

    return out.slice(0, 8);
  }, [query, workspaces]);

  function handleSelect(result: SearchResult) {
    setQuery("");
    setOpen(false);
    if (result.type === "space") {
      onSelectSpace(result.id);
    } else {
      onSelectWorkspace(result.id);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      {/* Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder="Search"
          className={cn(
            "h-8 w-full rounded-lg border border-border-subtle bg-panel pl-8 pr-7 text-[12.5px] font-semibold text-foreground placeholder:text-muted/70 placeholder:font-normal",
            "outline-none ring-0 transition-all duration-200 focus:border-accent/50 focus:ring-1 focus:ring-accent/30",
          )}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border-subtle bg-panel shadow-[0_16px_36px_rgba(4,25,28,0.15)]"
          >
            <div className="py-1">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.05] focus:bg-foreground/[0.05] outline-none"
                >
                  {/* Icon */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    {r.type === "workspace" ? (
                      <Layers3 className="h-3 w-3" />
                    ) : (
                      <Kanban className="h-3 w-3" />
                    )}
                  </span>

                  {/* Label + meta */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-foreground">
                      {r.label}
                    </span>
                    {r.workspaceName && (
                      <span className="block truncate text-[11px] text-muted">
                        {r.workspaceName}
                      </span>
                    )}
                  </span>

                  {/* Board type pill */}
                  {r.kind && (
                    <BoardCapsule kind={r.kind} className="shrink-0" />
                  )}

                  {/* Arrow icon — visible on hover */}
                  <SquareArrowOutUpRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* No results */}
        {open && query.trim().length > 0 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-border-subtle bg-panel px-3 py-3 shadow-[0_16px_36px_rgba(4,25,28,0.12)]"
          >
            <p className="text-[12px] text-muted text-center">No results for &ldquo;{query}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
