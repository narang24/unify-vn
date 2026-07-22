"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-full"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
