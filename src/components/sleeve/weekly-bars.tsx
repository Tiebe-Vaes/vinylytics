"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const AXIS = { tickLine: false, axisLine: false, tick: { fill: "var(--faint)", fontSize: 11 } } as const;
const shortWeek = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });

/** Minutes per week for one artist, track or album, in that item's ink. */
export function WeeklyBars({ weekly, ink }: { weekly: { week: string; minutes: number }[]; ink: string }) {
  const config = { minutes: { label: "Minutes", color: ink } } satisfies ChartConfig;
  const data = weekly.map((w) => ({ ...w, minutes: Math.round(w.minutes) }));
  return (
    <ChartContainer config={config} className="aspect-auto h-40 w-full">
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="week" {...AXIS} tickFormatter={shortWeek} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...AXIS} width={36} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Week of ${shortWeek(String(v))}`} />} />
        <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[1, 1, 0, 0]} maxBarSize={12} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
