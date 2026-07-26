"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipContextValue {
    open: boolean;
    setOpen: (o: boolean) => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}
const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLElement | null>(null);
    return (
        <TooltipContext.Provider value={{ open, setOpen, anchorRef }}>
            {children}
        </TooltipContext.Provider>
    );
}

export function TooltipTrigger({ children }: { children: React.ReactElement }) {
    const ctx = React.useContext(TooltipContext)!;
    return React.cloneElement(children as React.ReactElement<any>, {
        ref: (node: HTMLElement) => {
            ctx.anchorRef.current = node;
        },
        onMouseEnter: (e: React.MouseEvent) => {
            (children.props as any).onMouseEnter?.(e);
            ctx.setOpen(true);
        },
        onMouseLeave: (e: React.MouseEvent) => {
            (children.props as any).onMouseLeave?.(e);
            ctx.setOpen(false);
        },
    });
}

export function TooltipContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ctx = React.useContext(TooltipContext)!;
    const [mounted, setMounted] = React.useState(false);
    const [pos, setPos] = React.useState({ top: 0, left: 0 });

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (!ctx.open || !ctx.anchorRef.current) return;
        const rect = ctx.anchorRef.current.getBoundingClientRect();
        setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }, [ctx.open, ctx.anchorRef]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {ctx.open && (
                <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
                    className={cn(
                        "z-100 whitespace-nowrap rounded-md border border-border-subtle bg-panel px-2.5 py-1.5 text-[11.5px] font-semibold text-foreground shadow-[0_8px_20px_rgba(4,25,28,0.18)]",
                        className,
                    )}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}