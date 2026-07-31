"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(AlertDialogContext);
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
            className="absolute inset-0 bg-black/45"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative w-full max-w-sm rounded-xl border border-border-subtle bg-panel p-5 shadow-[0_24px_60px_rgba(0,0,0,0.32)]",
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function AlertDialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-2", className)}>{children}</div>;
}

export function AlertDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)}>{children}</h2>;
}

export function AlertDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-[13px] text-muted", className)}>{children}</p>;
}

export function AlertDialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)}>{children}</div>;
}

export function AlertDialogCancel({
  className,
  onClick,
  children = "Cancel",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(AlertDialogContext);
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        ctx?.setOpen(false);
      }}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-lg border border-border-subtle bg-transparent px-3 text-[12.5px] font-medium text-foreground hover:bg-foreground/[0.06]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({
  className,
  onClick,
  children = "Continue",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(AlertDialogContext);
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        ctx?.setOpen(false);
      }}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-[12.5px] font-semibold text-white hover:bg-red-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
