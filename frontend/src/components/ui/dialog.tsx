"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const ctx = React.useContext(DialogContext);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ctx]);

  if (!ctx || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {ctx.open && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#031517]/50 backdrop-blur-[2px]"
            onClick={() => ctx.setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative w-full max-w-sm rounded-2xl border border-border-subtle bg-panel p-5 shadow-[0_24px_60px_rgba(4,25,28,0.28)]",
              className,
            )}
          >
            <button
              onClick={() => ctx.setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-muted hover:bg-black/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 pr-6", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-[13px] text-muted", className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)}>{children}</div>;
}
