import type { SkipRow } from "@/lib/spotify/queries";

/** Most-skipped tracks or artists (10+ plays). Export data only. */
export function SkipRate({ title, rows }: { title: string; rows: SkipRow[] }) {
  return (
    <div>
      <h3 className="px-5 pt-4 pb-2 text-xs font-medium text-muted-foreground">{title}</h3>
      <ol>
        {rows.map((r) => (
          <li key={`${r.name}-${r.subtitle}`} className="flex items-center gap-3 border-t border-border px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.name}</div>
              {r.subtitle && <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>}
            </div>
            <span className="nums shrink-0 text-xs text-faint">{r.plays} plays</span>
            <span className="nums w-10 shrink-0 text-right text-sm font-semibold">{Math.round(r.skipRate * 100)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
