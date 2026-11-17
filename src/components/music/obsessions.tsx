import { shortDate } from "@/lib/format";
import type { Obsession } from "@/lib/spotify/stats";

/** Binges: tracks that lived on repeat for two weeks, then faded. */
export function Obsessions({ items }: { items: Obsession[] }) {
  return (
    <ol>
      {items.map((o) => (
        <li key={o.uri} className="flex items-baseline gap-4 border-t border-border px-0 py-3 first:border-t-0">
          <span className="nums w-12 shrink-0 text-2xl leading-none font-semibold tracking-tight">{o.streams}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{o.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {o.artist} · <span className="nums">{shortDate(o.start)} – {shortDate(o.end)}</span>
            </div>
          </div>
          <span className="nums shrink-0 text-xs text-faint">{Math.round(o.share * 100)}% of all plays</span>
        </li>
      ))}
    </ol>
  );
}
