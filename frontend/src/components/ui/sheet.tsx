"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
  widthClassName = "w-72",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right";
  widthClassName?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-150 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[#031517]/50"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative flex h-full flex-col overflow-y-auto scroll-thin bg-panel p-3 shadow-2xl",
              widthClassName,
              side === "right" && "ml-auto",
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
