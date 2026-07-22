import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
};

const buttonVariants = {
  default:
    "bg-[color:var(--accent)] text-[#f8f4ef] shadow-[0_10px_24px_rgba(44,53,91,0.18)] hover:bg-[color:var(--accent-soft)]",
  outline:
    "border border-[color:var(--border-subtle)] bg-transparent text-[color:var(--foreground)] hover:bg-white/45",
  ghost: "bg-transparent text-[color:var(--foreground)] hover:bg-black/5",
  secondary:
    "bg-white/65 text-[color:var(--foreground)] hover:bg-white/90 border border-white/70",
};

const buttonSizes = {
  default: "h-11 px-5 text-sm",
  sm: "h-9 px-3 text-xs",
  lg: "h-12 px-6 text-sm",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";