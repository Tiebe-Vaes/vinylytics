"use client";

import { Heatmap, type HeatmapPoint } from "@/components/marks";

/** Client wrapper so the minutes formatter stays on the client side of Heatmap. */
export function YearCalendar({ days, year }: { days: HeatmapPoint[]; year: number }) {
  return <Heatmap data={days} start={`${year}-01-01`} end={`${year}-12-31`} format={(v) => `${Math.round(v)} min`} />;
}
