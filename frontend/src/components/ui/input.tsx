import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--panel)] px-3 text-[13px] text-[color:var(--foreground)] transition placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/25",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";