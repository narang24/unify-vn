import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-[color:var(--border-subtle)] bg-white/55 px-4 text-sm text-[color:var(--foreground)] shadow-[0_1px_0_rgba(255,255,255,0.6),0_6px_14px_rgba(44,53,91,0.04)] transition placeholder:text-[#8f8a80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";