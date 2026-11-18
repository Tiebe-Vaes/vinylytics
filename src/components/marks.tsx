"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { useRamp } from "./chart-theme";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type HeatmapPoint = { date: string; value: number };

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

/**
 * GitHub-style calendar: one small rounded square per day, weeks as columns,
 * Monday at the top. Colour is a sequential blue ramp (magnitude, not
 * identity). Days with no data stay on the muted surface rather than taking
 * the ramp's lightest step, so "nothing recorded" never reads as "a low value".
 *
 * The grid keeps its 11px cells and scrolls inside its own panel when a whole
 * year does not fit (phones), never the page.
 */
export function Heatmap({
  data,
  start: rangeStart,
  end: rangeEnd,
  format = (v) => String(Math.round(v)),
  thresholds: fixed,
  legend = ["Less", "More"],
  className,
  activeDay,
  onDay,
}: {
  data: HeatmapPoint[];
  activeDay?: string;
  onDay?: (key: string) => void;
  /** Inclusive "YYYY-MM-DD" bounds — a year, a month, whatever the caller wants. */
  start: string;
  end: string;
  format?: (v: number) => string;
  /** Four fixed cut points for a known scale (mood 1–5); default is quantiles. */
  thresholds?: [number, number, number, number];
  legend?: [string, string];
  className?: string;
}) {
  const ramp = useRamp();
  // Open on the most recent weeks: on a phone the grid scrolls, and today sits at the right end.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [rangeEnd]);

  const { columns, thresholds } = useMemo(() => {
    const byDate = new Map(data.map((d) => [d.date, d.value]));

    // Quantile thresholds beat linear bins here: step counts are skewed, and a
    // single 30k day would otherwise flatten the whole range into step 1.
    const inRange = data.filter((d) => d.date >= rangeStart && d.date <= rangeEnd);
    const values = inRange.map((d) => d.value).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => values[Math.floor(values.length * p)] ?? 0;
    const thresholds = fixed ?? [q(0.2), q(0.4), q(0.6), q(0.8)];

    const start = new Date(`${rangeStart}T12:00:00Z`);
    // Back up to the Monday on or before the range start so columns are whole weeks.
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    const end = new Date(`${rangeEnd}T12:00:00Z`);

    const columns: ({ date: string; value: number | null } | null)[][] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const col: ({ date: string; value: number | null } | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const key = cursor.toISOString().slice(0, 10);
        col.push(
          key >= rangeStart && key <= rangeEnd
            ? { date: key, value: byDate.get(key) ?? null }
            : null
        );
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      columns.push(col);
    }

    return { columns, thresholds };
  }, [data, rangeStart, rangeEnd, fixed]);

  const colorFor = (value: number | null) => {
    if (value == null || value <= 0) return "var(--muted)";
    const step = thresholds.filter((t) => value > t).length;
    return ramp[Math.min(step, ramp.length - 1)];
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={scroller} className="overflow-x-auto">
        <div
          className="inline-grid gap-[3px] text-[11px] leading-[11px] text-faint"
          style={{ gridTemplateColumns: `auto repeat(${columns.length}, 11px)` }}
        >
          {/* Month labels, above each month's first column. */}
          <span />
          {columns.map((col, i) => {
            const first = col.find((c) => c && c.date.endsWith("-01"));
            const month = first ? Number(first.date.slice(5, 7)) - 1 : null;
            return (
              <span key={i} className="whitespace-nowrap">
                {month != null ? MONTHS[month] : ""}
              </span>
            );
          })}

          {/* Weekday labels, then one row per weekday. */}
          {WEEKDAYS.map((label, row) => (
            <Fragment key={row}>
              <span className="pr-1.5 text-right">{label}</span>
              {columns.map((col, i) => {
                const cell = col[row];
                if (!cell) return <span key={i} />;
                const title = `${shortDate(cell.date)}: ${
                  cell.value != null ? format(cell.value) : "no data"
                }`;
                if (onDay) return (
                  <button key={i} type="button" data-day={cell.date} title={title} aria-label={title}
                    tabIndex={cell.date === activeDay ? 0 : -1} aria-pressed={cell.date === activeDay}
                    onPointerEnter={e=>{if(e.pointerType === "mouse") onDay(cell.date);}}
                    onFocus={()=>onDay(cell.date)} onClick={()=>onDay(cell.date)}
                    onKeyDown={e=>{
                      const shifts: Record<string,number> = {ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1};
                      const shift = shifts[e.key];
                      if (!shift) return;
                      e.preventDefault();
                      const date = new Date(`${cell.date}T12:00:00Z`);
                      date.setUTCDate(date.getUTCDate()+shift);
                      const next = date.toISOString().slice(0,10);
                      scroller.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus();
                    }}
                    className="size-[11px] rounded-[2px] aria-pressed:outline aria-pressed:outline-1 aria-pressed:outline-text"
                    style={{background:colorFor(cell.value)}}/>
                );
                return (
                  <span
                    key={i}
                    title={title}
                    aria-label={title}
                    className="size-[11px] rounded-[2px]"
                    style={{ background: colorFor(cell.value) }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[11px] text-faint">
        <span className="mr-1">{legend[0]}</span>
        <span className="size-[11px] rounded-[2px]" style={{ background: "var(--muted)" }} />
        {ramp.map((c) => (
          <span key={c} className="size-[11px] rounded-[2px]" style={{ background: c }} />
        ))}
        <span className="ml-1">{legend[1]}</span>
      </div>
    </div>
  );
}
