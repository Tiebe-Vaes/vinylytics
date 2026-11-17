"use client";

import { useMemo } from "react";
import { useRamp } from "@/components/chart-theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * When you listen: weekdays as rows, hours as columns. Same sequential ramp
 * and quantile steps as the calendar heatmap, so the two read alike. Cells
 * stretch to the panel width instead of scrolling: 24 columns fit at 390px.
 */
export function HourHeatmap({ data }: { data: { weekday: number; hour: number; minutes: number }[] }) {
  const ramp = useRamp();

  const { grid, thresholds } = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const d of data) grid[d.weekday][d.hour] += d.minutes;
    const values = grid.flat().filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => values[Math.floor(values.length * p)] ?? 0;
    return { grid, thresholds: [q(0.2), q(0.4), q(0.6), q(0.8)] };
  }, [data]);

  const color = (v: number) =>
    v <= 0 ? "var(--muted)" : ramp[Math.min(thresholds.filter((t) => v > t).length, ramp.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-[2px] text-[11px] leading-none text-faint"
        style={{ gridTemplateColumns: "2rem repeat(24, minmax(0, 1fr))" }}
      >
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="nums pb-1 text-center">
            {h % 6 === 0 ? h : ""}
          </span>
        ))}
        {grid.map((row, w) => (
          <div key={w} className="contents">
            <span className="flex items-center">{DAYS[w]}</span>
            {row.map((v, h) => {
              const label = `${DAYS[w]} ${String(h).padStart(2, "0")}:00: ${Math.round(v)} min`;
              return (
                <span
                  key={h}
                  title={label}
                  aria-label={label}
                  className="aspect-square rounded-[2px]"
                  style={{ background: color(v) }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px] text-faint">
        <span className="mr-1">Less</span>
        <span className="size-[11px] rounded-[2px]" style={{ background: "var(--muted)" }} />
        {ramp.map((c) => (
          <span key={c} className="size-[11px] rounded-[2px]" style={{ background: c }} />
        ))}
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}
