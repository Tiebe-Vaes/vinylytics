import Link from "next/link";
import { inkHex, inkText } from "@/lib/ink";
import type { EraView } from "@/lib/spotify/eras-data";
import { timelineSegments } from "@/lib/spotify/era-timeline";
import { eraSpan } from "./sleeve";

/** The years as bands of eras, like rock strata; each band opens its era. */
export function EraTimeline({ eras, today }: { eras: EraView[]; today: string }) {
  if (eras.length === 0) return null;
  const from = eras.reduce((min, e) => (e.start < min ? e.start : min), eras[0].start);
  const segs = timelineSegments(eras, from, today);
  const lanes = Math.max(1, ...segs.map((s) => s.lane + 1));
  const years = Array.from({ length: Number(today.slice(0, 4)) - Number(from.slice(0, 4)) }, (_, i) => Number(from.slice(0, 4)) + i + 1);
  const at = (key: string) => (Date.parse(`${key}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (Date.parse(`${today}T00:00:00Z`) + 86_400_000 - Date.parse(`${from}T00:00:00Z`));
  return (
    <nav aria-label="Era timeline" className="mb-6">
      <div className="relative" style={{ height: lanes * 34 }}>
        {segs.map((s) => {
          const bg = inkHex(s.ink);
          return (
            <Link key={s.id} href={`/eras/${s.id}`} aria-label={`${s.name}, ${eraSpan(s)}`} title={`${s.name} · ${eraSpan(s)}`}
              className="group absolute flex h-7 min-w-6 items-center overflow-hidden px-2 text-xs font-semibold transition-transform duration-200 ease-[cubic-bezier(0.2,0.9,0.25,1.35)] hover:-translate-y-1 focus-visible:-translate-y-1"
              style={{ left: `${s.left * 100}%`, width: `${s.width * 100}%`, top: s.lane * 34, background: bg, color: inkText(bg) }}>
              <span className="truncate">{s.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted-text" aria-hidden="true">
        {years.map((y) => <span key={y} className="absolute -translate-x-1/2 border-l border-rule pl-1" style={{ left: `${at(`${y}-01-01`) * 100}%` }}>{y}</span>)}
      </div>
    </nav>
  );
}
