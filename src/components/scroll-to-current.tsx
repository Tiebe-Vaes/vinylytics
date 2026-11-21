"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A horizontally scrolling list that opens centred on its `aria-current` item, or at its end. */
export function ScrollToCurrent({ className, children }: { className?: string; children: ReactNode }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const current = el.querySelector<HTMLElement>("[aria-current]")?.closest("li");
    el.scrollLeft = current ? current.offsetLeft - el.clientWidth / 2 + current.offsetWidth / 2 : el.scrollWidth;
  }, []);
  return <ol ref={list} className={className}>{children}</ol>;
}
