"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (o: boolean) => void;
}
const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export function Popover({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (o: boolean) => {
      setUncontrolledOpen(o);
      onOpenChange?.(o);
    },
    [onOpenChange],
  );
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }: { children: React.ReactElement }) {
  const ctx = React.useContext(PopoverContext)!;
  return React.cloneElement(children as React.ReactElement<any>, {
    onClick: (e: React.MouseEvent) => {
      if ((children.props as any).onClick) (children.props as any).onClick(e);
      ctx.setOpen(!ctx.open);
    },
  });
}

export function PopoverContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ctx = React.useContext(PopoverContext)!;
  return (
    <AnimatePresence>
      {ctx.open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "absolute z-50 mt-2 w-80 rounded-xl border border-border-subtle bg-panel p-3 shadow-[0_16px_36px_rgba(4,25,28,0.18)]",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
