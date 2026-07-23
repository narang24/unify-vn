import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--panel)] shadow-[0_18px_42px_rgba(44,53,91,0.08)]",
        className,
      )}
      {...props}
    />
  );
}