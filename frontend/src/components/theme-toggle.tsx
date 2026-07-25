"use client";

import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 46,
        height: 24,
        borderRadius: 12,
        border: "2px solid #0c8f8f",
        backgroundColor: isDark ? "#0c1f1f" : "#e6f4f3",
        cursor: "pointer",
        transition: "background-color 0.3s",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {/* Sliding crescent/sun circle */}
      <span
        style={{
          position: "absolute",
          top: 3,
          left: isDark ? 4 : 24,
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: isDark ? "#0c1f1f" : "#0c8f8f",
          boxShadow: isDark
            ? "inset 6px -2px 0px 0px #0c8f8f"
            : "none",
          transition: "left 0.3s, background-color 0.3s, box-shadow 0.3s",
        }}
      />
    </button>
  );
}
