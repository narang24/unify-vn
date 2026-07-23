import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders /public/logo.png cropped into a circle. Used anywhere the old
 * "U" square badge used to appear (sidebar, topbar). The favicon itself
 * (browser tab icon) is set via app/layout.tsx metadata.icons — browsers
 * render that image as-is, so for a truly circular tab icon the source
 * PNG should have transparent corners.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
    return (
        <div
            style={{ width: size, height: size }}
            className={cn(
                "relative shrink-0 overflow-hidden rounded-full ring-1 ring-black/5",
                className,
            )}
        >
            <Image src="/logo.png" alt="Unify" fill sizes={`${size}px`} className="object-cover" />
        </div>
    );
}