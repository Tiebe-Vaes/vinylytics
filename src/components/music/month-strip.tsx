import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ListeningDay } from "@/lib/spotify/history";
import { cn } from "@/lib/utils";
import { ScrollToCurrent } from "@/components/scroll-to-current";

const monthName = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const shift = (month: string, n: number) => {
  const d = new Date(`${month}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

/** One month as a row of day bars (height = minutes); each bar opens that day. */
export function MonthStrip({ days, month, selected, today }: { days: ListeningDay[]; month: string; selected?: string; today: string }) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const next = shift(month, 1);
  return (
    <nav aria-label={`Days in ${monthName(month)}`} className="sticky top-0 z-20 -mx-4 mb-6 border-y border-rule bg-ground/95 px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <Link href={`/history?day=${shift(month, -1)}-01`} className="inline-flex min-h-11 items-center gap-1 hover:text-brand"><ChevronLeft className="size-4" aria-hidden />Earlier</Link>
        <span>{monthName(month)}</span>
        {`${next}-01` <= today
          ? <Link href={`/history?day=${next}-01`} className="inline-flex min-h-11 items-center gap-1 hover:text-brand">Later<ChevronRight className="size-4" aria-hidden /></Link>
          : <span className="w-16" />}
      </div>
      {days.length === 0 && <p className="text-xs text-muted-text">No listening this month yet.</p>}
      {/* 20 px bars with 4 px gaps keep each day a 24 px target; on a phone the month scrolls. */}
      <ScrollToCurrent className="flex h-14 items-end gap-1 overflow-x-auto">
        {Array.from({ length: count }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const day = byDay.get(key);
          if (key > today) return <li key={key} className="h-1 min-w-5 flex-1 bg-raised" aria-hidden />;
          return (
            <li key={key} className="flex h-full min-w-5 flex-1 items-end">
              <Link href={`/history?day=${key}`} aria-label={`${i + 1} ${monthName(month)}${day ? `, ${Math.round(day.minutes)} min` : ", no listening"}`}
                aria-current={key === selected ? "date" : undefined}
                className="group/day flex h-full w-full items-end justify-center">
                {/* A day without listening is a dot, so it reads as "nothing" rather than a sliver. */}
                <span className={cn("block transition-[height,background-color] duration-200 group-hover/day:bg-brand", day ? "w-full" : "size-1.5 rounded-full",
                  key === selected ? "bg-brand" : day ? "bg-text" : "bg-faint")}
                  style={day ? { height: `${Math.max(12, (day.minutes / max) * 100)}%` } : undefined} />
              </Link>
            </li>
          );
        })}
      </ScrollToCurrent>
    </nav>
  );
}
