import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
};

const buttonVariants = {
  default:
    "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-sm hover:bg-[color:var(--accent-soft)]",
  outline:
    "border border-[color:var(--border-subtle)] bg-transparent text-[color:var(--foreground)] hover:bg-foreground/[0.06]",
  ghost: "bg-transparent text-[color:var(--foreground)] hover:bg-foreground/[0.06]",
  secondary:
    "bg-panel-strong text-[color:var(--foreground)] border border-[color:var(--border-subtle)] hover:bg-foreground/[0.06]",
};

const buttonSizes = {
  default: "h-9 px-4 text-[13px]",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-5 text-sm",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";