"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, XCircle, Info } from "lucide-react";
import { useToast, dismissToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

const icons = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-100 flex flex-col items-center gap-2 sm:bottom-6 sm:items-end sm:right-6 sm:inset-x-auto">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.variant ?? "default"];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto flex w-[92vw] max-w-80 items-start gap-2 rounded-xl border border-border-subtle bg-panel/95 px-3 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(4,25,28,0.16)] backdrop-blur-sm",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  t.variant === "success" && "text-success",
                  t.variant === "error" && "text-danger",
                  (!t.variant || t.variant === "default") && "text-accent",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 rounded-md p-0.5 text-muted hover:bg-black/5 hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
