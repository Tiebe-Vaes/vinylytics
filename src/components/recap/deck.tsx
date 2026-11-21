"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
// The PNG renderer draws with these exact faces; loading them here makes the deck card and the shared image match.
import "@fontsource/big-shoulders/900.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/sleeve/share-button";
import type { InkId } from "@/lib/ink";

export type DeckItem = {
  id: string; label: string; summary: string; href: string; filename: string; ink: InkId;
  /** The share card itself (1080 × 1350), drawn by the same code as the PNG. */
  card: ReactNode;
};

/** A 1080-wide card scaled down to whatever width its slot has. */
function Scaled({ children, label }: { children: ReactNode; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1080);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} role="img" aria-label={label} className="relative aspect-[4/5] w-full overflow-hidden bg-raised">
      <div aria-hidden="true" className="absolute top-0 left-0 origin-top-left" style={{ width: 1080, height: 1350, transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/** The year as a deck of share cards: swipe, arrow keys or the buttons; every card has its own Share. */
export function Deck({ year, items }: { year: number; items: DeckItem[] }) {
  const list = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const combo = items.filter((i) => i.id !== "poster").map(({ id, label }) => ({ id, label }));

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      if (!first) return;
      const step = first.offsetWidth + 16;
      setIndex(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const go = (to: number) => {
    const next = Math.min(items.length - 1, Math.max(0, to));
    (list.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "start" });
    setIndex(next);
  };

  return (
    <section aria-label={`Your ${year} as cards`} className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-text" aria-live="polite"><span className="font-semibold text-text">{index + 1}</span> / {items.length} · {items[index]?.label}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="size-11" aria-label="Previous card" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft aria-hidden="true" /></Button>
          <Button variant="outline" className="size-11" aria-label="Next card" disabled={index === items.length - 1} onClick={() => go(index + 1)}><ChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
      <div aria-hidden="true" className="mb-4 h-1 bg-muted"><div className="h-full bg-text transition-[width] duration-300" style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
      <ul ref={list} tabIndex={0} aria-label="Recap cards" className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 outline-offset-4"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
        }}>
        {items.map((item) => (
          <li key={item.id} className="flex w-[min(82vw,360px)] shrink-0 snap-start flex-col gap-3">
            <Scaled label={item.summary}>{item.card}</Scaled>
            <ShareButton href={item.href} filename={item.filename} title={item.label} defaultInk={item.ink}
              combo={item.id === "poster" ? undefined : { first: item.id, options: combo }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
