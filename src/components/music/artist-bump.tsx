"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { ChartData } from "@/lib/spotify/data";
import { cn } from "@/lib/utils";

const AXIS = { tickLine: false, axisLine: false, tick: { fill: "var(--faint)", fontSize: 11 } } as const;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return m === 1 ? `${month} '${String(y).slice(2)}` : month;
}

/**
 * Rank of the top artists month by month. Eight hues would break the palette,
 * so every line is the neutral series and one focused artist takes chart-1:
 * emphasis, not identity. The list beside the chart is the legend and the
 * focus control, so names never depend on colour.
 */
export function ArtistBump({ bump }: { bump: ChartData["bump"] }) {
  const [focus, setFocus] = useState<string | null>(null);
  const focused = focus ?? bump.artists[0] ?? null;

  const data = bump.months.map((month, i) => ({
    month,
    ...Object.fromEntries(bump.artists.map((a) => [a, bump.ranks[a][i]])),
  }));
  const config = Object.fromEntries(bump.artists.map((a) => [a, { label: a }])) satisfies ChartConfig;
  const n = bump.artists.length;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_12rem]">
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...AXIS} reversed domain={[1, n]} ticks={[1, n]} interval={0} width={28} tickFormatter={(v: number) => `#${v}`} />
          <ChartTooltip
            cursor={{ stroke: "var(--strong)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const ranked = payload
                .filter((p) => p.value != null)
                .sort((a, b) => Number(a.value) - Number(b.value));
              return (
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                  <div className="mb-1 font-medium">{monthLabel(String(label))}</div>
                  {ranked.map((p) => (
                    <div key={String(p.dataKey)} className={cn("nums flex gap-2", p.dataKey === focused ? "text-foreground" : "text-muted-foreground")}>
                      <span className="w-5 text-right">#{String(p.value)}</span>
                      <span>{String(p.dataKey)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {/* Focused line last so it draws on top. */}
          {[...bump.artists.filter((a) => a !== focused), ...(focused ? [focused] : [])].map((a) => (
            <Line
              key={a}
              dataKey={a}
              type="monotone"
              connectNulls={false}
              stroke={a === focused ? "var(--chart-1)" : "var(--chart-5)"}
              strokeWidth={a === focused ? 2.5 : 1.5}
              strokeOpacity={a === focused ? 1 : 0.6}
              dot={{ r: a === focused ? 3.5 : 2.5, strokeWidth: 0, fill: a === focused ? "var(--chart-1)" : "var(--chart-5)" }}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      <ol className="flex flex-col text-sm">
        {bump.artists.map((a, i) => (
          <li key={a}>
            <button
              type="button"
              onClick={() => setFocus(a)}
              onMouseEnter={() => setFocus(a)}
              aria-pressed={a === focused}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted",
                a === focused ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ background: a === focused ? "var(--chart-1)" : "var(--chart-5)" }}
                aria-hidden
              />
              <span className="nums w-4 shrink-0 text-xs text-faint">{i + 1}</span>
              <span className="truncate">{a}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
