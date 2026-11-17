"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, Empty, SectionLabel } from "@/components/panel";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const CONFIG = { minutes: { label: "Minutes", color: "var(--chart-1)" } } satisfies ChartConfig;
const AXIS = { tickLine: false, axisLine: false, tick: { fill: "var(--faint)", fontSize: 11 } } as const;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  // January carries the year so a 24-month axis isn't ambiguous.
  return m === 1 ? `${month} '${String(y).slice(2)}` : month;
}

/** Minutes per month, last 24 months. Single series, so no legend: the title names it. */
export function MinutesChart({ byMonth }: { byMonth: { month: string; minutes: number }[] }) {
  const data = byMonth.slice(-24).map((m) => ({ ...m, minutes: Math.round(m.minutes) }));

  return (
    <Card>
      <SectionLabel>Minutes per month</SectionLabel>
      {data.length === 0 ? (
        <Empty>No listening stored yet.</Empty>
      ) : (
        <div className="py-4">
          <ChartContainer config={CONFIG} className="aspect-auto h-56 w-full">
            <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...AXIS} width={44} tickFormatter={(v: number) => v.toLocaleString("en-GB")} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => {
                      const [y, m] = String(v).split("-").map(Number);
                      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
                    }}
                  />
                }
              />
              <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[1, 1, 0, 0]} maxBarSize={10} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Card>
  );
}
