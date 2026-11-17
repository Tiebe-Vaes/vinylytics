"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, Empty, SectionLabel } from "@/components/panel";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MusicData, TopRange } from "@/lib/spotify/data";
import type { TopItem } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

const RANGES: { value: TopRange; label: string }[] = [
  { value: "4w", label: "4 weeks" },
  { value: "6m", label: "6 months" },
  { value: "all", label: "All time" },
];

/** Top artists and tracks side by side, one range toggle for both. */
export function TopLists({ top }: { top: MusicData["top"] }) {
  const [range, setRange] = useState<TopRange>("4w");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">On repeat</h2>
        <ToggleGroup
          aria-label="Range"
          value={[range]}
          onValueChange={(v) => {
            const next = v[0] as TopRange | undefined;
            if (next) setRange(next);
          }}
          variant="outline"
          size="sm"
          spacing={0}
        >
          {RANGES.map((r) => (
            <ToggleGroupItem key={r.value} value={r.value} className="px-2.5 text-xs">
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <List title="Top artists" items={top.artists[range]} round />
        <List title="Top tracks" items={top.tracks[range]} />
      </div>
    </section>
  );
}

function List({ title, items, round = false }: { title: string; items: TopItem[]; round?: boolean }) {
  const [lead, ...rest] = items.slice(0, 10);
  return (
    <Card className="overflow-hidden">
      <SectionLabel>{title}</SectionLabel>
      {!lead ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <>
          {/* Number one gets the room: big art, display-size name. */}
          <a
            href={lead.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-4 border-b border-border p-5"
          >
            <Art item={lead} size="lg" round={round} />
            <div className="min-w-0">
              <div className="nums text-xs text-muted-foreground">#1</div>
              <div className="mt-0.5 line-clamp-2 text-2xl leading-tight font-semibold tracking-tight underline-offset-4 group-hover:underline sm:text-3xl">
                {lead.name}
              </div>
              {lead.subtitle && <div className="mt-1 truncate text-sm text-muted-foreground">{lead.subtitle}</div>}
              <Meta item={lead} className="mt-1" />
            </div>
          </a>
          <ol>
            {rest.map((item, i) => (
              <li key={`${item.name}-${i}`} className="border-t border-border first:border-t-0">
                <a
                  href={item.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted"
                >
                  <span className="nums w-5 shrink-0 text-right text-xs text-faint">{i + 2}</span>
                  <Art item={item} size="sm" round={round} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    {item.subtitle && <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>}
                  </div>
                  <Meta item={item} />
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

function Meta({ item, className }: { item: TopItem; className?: string }) {
  if (item.streams == null) return null;
  return (
    <span className={cn("nums shrink-0 text-xs text-faint", className)}>
      {item.streams.toLocaleString("en-GB")} {item.streams === 1 ? "play" : "plays"}
    </span>
  );
}

function Art({ item, size, round }: { item: TopItem; size: "lg" | "sm"; round: boolean }) {
  const box = size === "lg" ? "size-20 sm:size-24" : "size-9";
  const shape = round ? "rounded-full" : size === "lg" ? "rounded-lg" : "rounded-md";
  if (item.imageUrl) {
    return (
      <Image
        src={item.imageUrl}
        alt=""
        width={size === "lg" ? 192 : 72}
        height={size === "lg" ? 192 : 72}
        className={cn(box, shape, "shrink-0 border border-border object-cover")}
      />
    );
  }
  // No art yet (not enriched, or a local file): initials on a quiet tile.
  const initials = item.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        box,
        shape,
        "flex shrink-0 items-center justify-center border border-border bg-muted font-semibold text-muted-foreground",
        size === "lg" ? "text-xl" : "text-[11px]"
      )}
    >
      {initials}
    </span>
  );
}
