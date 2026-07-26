"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  duration = 1,
  clockwise = true,
  active = false,
  onClick,
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
    active?: boolean;
    onClick?: () => void;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = clockwise
      ? (currentIndex - 1 + directions.length) % directions.length
      : (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, #2f9aa6 0%, rgba(255, 255, 255, 0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, #2f9aa6 0%, rgba(255, 255, 255, 0) 100%)",
    BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, #2f9aa6 0%, rgba(255, 255, 255, 0) 100%)",
    RIGHT: "radial-gradient(16.2% 41.19% at 100% 50%, #2f9aa6 0%, rgba(255, 255, 255, 0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.157% at 50% 50%, #2f9aa6 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [hovered, active, duration, clockwise]);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={cn(
        "group relative flex h-min w-full flex-col flex-nowrap justify-between overflow-hidden rounded-lg p-[1.5px] transition-all duration-300 hover:scale-[1.03] bg-[#2f9aa6]/30 group-hover:bg-transparent group-hover:p-0",
        active && "scale-[1.03] bg-transparent p-0",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "relative z-10 flex w-full items-center rounded-[6px] bg-panel px-2.5 py-2 text-[13px] font-semibold text-[#2f9aa6] transition-colors duration-300 group-hover:text-white overflow-hidden",
          active && "text-white",
          className
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-0 bg-[#16606a]/90 transition-all duration-300 ease-out group-hover:w-full -z-10", active && "w-full")} />
        {children}
      </div>
      <motion.div
        className={cn(
          "absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit] transition-opacity duration-300 group-hover:opacity-0",
          active && "opacity-0"
        )}
        style={{
          filter: "blur(2px)",
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: movingMap[direction],
        }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className={cn("absolute inset-[1px] z-1 rounded-[7px] bg-panel")} />
    </Tag>
  );
}
