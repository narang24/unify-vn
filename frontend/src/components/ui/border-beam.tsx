"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * MagicUI-style "Border Beam" — a light trail that travels around the
 * border of its (relatively-positioned) parent. Pure CSS + Framer Motion,
 * no extra dependencies.
 */
export function BorderBeam({
  size = 90,
  duration = 6,
  colorFrom = "var(--accent)",
  colorTo = "var(--accent-soft)",
  className,
}: {
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}>
      <motion.div
        className="absolute aspect-square"
        style={{
          width: size,
          background: `linear-gradient(90deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
          offsetPath: `rect(0% auto auto 0% round ${size}px)`,
        }}
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
