"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

const CONFIG = { count: { label: "New artists", color: "var(--chart-3)" } } satisfies ChartConfig;
const AXIS = { tickLine: false, axisLine: false, tick: { fill: "var(--faint)", fontSize: 11 } } as const;

function monthLabel(key: string, long = false): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  if (long) return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return m === 1 ? `${month} '${String(y).slice(2)}` : month;
}

type Row = { month: string; count: number; names: string[] };

/** New artists per month; the tooltip names the biggest finds. */
export function Discovery({ data }: { data: Row[] }) {
  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-48 w-full">
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="month" {...AXIS} tickFormatter={(v: string) => monthLabel(v)} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...AXIS} width={28} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }) => {
            const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
            if (!row) return null;
            return (
              <div className="max-w-56 rounded-[2px] border border-border bg-background px-3 py-2 text-xs">
                <div className="font-medium">{monthLabel(row.month, true)}</div>
                <div className="nums mt-0.5 text-muted-foreground">{row.count} new artists</div>
                {row.names.length > 0 && <div className="mt-1 text-muted-foreground">{row.names.join(", ")}</div>}
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={10} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
