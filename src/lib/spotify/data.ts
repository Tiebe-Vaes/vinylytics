import type { Range } from "./types";

const DAY = 86_400_000;

/** The Charts page presets; "custom" dates are parsed in chart-filters. */
export type ChartRange = "4w" | "6m" | "1y" | "all";
export const CHART_RANGES: { value: ChartRange; label: string; days: number | null }[] = [
  { value: "4w", label: "4 weeks", days: 28 },
  { value: "6m", label: "6 months", days: 182 },
  { value: "1y", label: "1 year", days: 365 },
  { value: "all", label: "All time", days: null },
];

export function chartRange(value: ChartRange, now = new Date()): Range {
  const days = CHART_RANGES.find((r) => r.value === value)?.days ?? null;
  return days == null ? null : { from: new Date(now.getTime() - days * DAY), to: now };
}
