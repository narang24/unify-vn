"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Centered, gently-rotating "3D" hero mark for the Unify Intelli workspace.
 * Built with CSS 3D transforms driven by Framer Motion (Aceternity/MagicUI
 * style) rather than a heavyweight WebGL dependency.
 */
export function Logo3D({ size = 132 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, perspective: 900 }}
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="absolute -inset-8 rounded-full bg-accent/25 blur-2xl"
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating 3D shell */}
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[28%] shadow-[0_30px_60px_rgba(1,106,131,0.35)]"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 60%, var(--lagoon) 100%)",
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateX: [8, -8, 8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span
            className="font-display text-[42px] font-bold italic text-white"
            style={{ transform: "translateZ(30px)" }}
          >
            U
          </span>
          <motion.span
            className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent shadow-lg"
            style={{ transform: "translateZ(46px)" }}
            animate={{ rotate: [0, 15, 0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4.5 w-4.5" />
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Reflection */}
      <div
        className="absolute -bottom-6 left-1/2 h-4 w-2/3 -translate-x-1/2 rounded-full bg-accent/20 blur-md"
        aria-hidden
      />
    </div>
  );
}
