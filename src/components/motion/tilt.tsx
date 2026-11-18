"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lifts on hover and leans toward a mouse pointer. Pure CSS variables, so pages
 * ship no animation library; reduced motion turns the transform off in globals.css.
 */
export function Tilt({ children, max = 6, className }: { children: ReactNode; max?: number; className?: string }) {
  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--ry", `${(x * max * 2).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--rx", `${(-y * max * 2).toFixed(2)}deg`);
  }
  function leave(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.removeProperty("--ry");
    e.currentTarget.style.removeProperty("--rx");
  }
  return <div className={cn("tilt", className)} onPointerMove={move} onPointerLeave={leave}>{children}</div>;
}
