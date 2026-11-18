"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const label = (key: string, opts: Intl.DateTimeFormatOptions) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
const pad = (n: number) => String(n).padStart(2, "0");

/** A date button opening a month grid with presets; days with listening carry a dot. */
export function DayPicker({ value, min, max, activeDays, presets }: {
  value: string; min: string; max: string; activeDays: string[]; presets: { label: string; day: string }[];
}) {
  const router = useRouter();
  const [month, setMonth] = useState(value.slice(0, 7));
  const active = new Set(activeDays);
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const step = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 15)); setMonth(d.toISOString().slice(0, 7)); };
  const go = (key: string) => router.push(`/history?day=${key}`);

  function key(e: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const d = (e.target as HTMLElement).dataset.day;
    if (!d || !(e.key in moves)) return;
    e.preventDefault();
    const t = new Date(`${d}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + moves[e.key]);
    const next = t.toISOString().slice(0, 10);
    if (next < min || next > max) return;
    if (next.slice(0, 7) !== month) setMonth(next.slice(0, 7));
    requestAnimationFrame(() => (document.querySelector(`[data-day="${next}"]`) as HTMLElement | null)?.focus());
  }

  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex min-h-11 items-center gap-2 border border-strong px-3 text-sm font-semibold transition-colors hover:bg-raised">
        <CalendarDays className="size-4" aria-hidden="true" />{label(value, { day: "numeric", month: "short", year: "numeric" })}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup aria-label="Choose a day" className="w-[19rem] max-w-[calc(100vw-2rem)] border border-strong bg-ground p-3 shadow-lg transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="mb-3 flex flex-wrap gap-1">
              {presets.filter((p) => p.day >= min && p.day <= max).map((p) => (
                <Link key={p.label} href={`/history?day=${p.day}`} className="min-h-9 border border-strong px-2 py-1 text-xs font-semibold hover:bg-raised">{p.label}</Link>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => step(-1)} disabled={`${month}-01` <= min} className="grid size-11 place-items-center hover:bg-raised disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <span className="text-sm font-semibold" aria-live="polite">{label(`${month}-15`, { month: "long", year: "numeric" })}</span>
              <button type="button" aria-label="Next month" onClick={() => step(1)} disabled={`${month}-31` >= max && month >= max.slice(0, 7)} className="grid size-11 place-items-center hover:bg-raised disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted-text" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div role="grid" aria-label="Days" className="grid grid-cols-7" onKeyDown={key}>
              {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: count }, (_, i) => {
                const k = `${month}-${pad(i + 1)}`;
                const out = k < min || k > max;
                return (
                  <button key={k} type="button" data-day={k} disabled={out} onClick={() => go(k)} tabIndex={k === value || (value.slice(0, 7) !== month && i === 0) ? 0 : -1}
                    aria-label={`${label(k, { weekday: "long", day: "numeric", month: "long" })}${active.has(k) ? ", listening" : ""}`} aria-current={k === value ? "date" : undefined}
                    className={cn("relative grid h-10 place-items-center text-sm hover:bg-raised focus-visible:outline-2 focus-visible:outline-text disabled:opacity-25", k === value && "bg-text text-ground hover:bg-text")}>
                    {i + 1}
                    {active.has(k) && <span aria-hidden className={cn("absolute bottom-1 size-1 rounded-full", k === value ? "bg-ground" : "bg-brand")} />}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
