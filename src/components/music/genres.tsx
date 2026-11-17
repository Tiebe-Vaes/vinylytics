import type { ChartData } from "@/lib/spotify/data";

/**
 * Minutes per genre as plain horizontal bars: one series, so one hue, and
 * "other" in the neutral so it never competes with a real genre.
 */
export function Genres({ genres }: { genres: ChartData["genres"] }) {
  const total = genres.reduce((a, g) => a + g.minutes, 0);
  const max = Math.max(...genres.map((g) => g.minutes), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {genres.map((g) => {
        const pct = total > 0 ? Math.round((g.minutes / total) * 100) : 0;
        return (
          <li key={g.genre} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate capitalize">{g.genre}</span>
            <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(g.minutes / max) * 100}%`,
                  background: g.genre === "other" ? "var(--chart-5)" : "var(--chart-1)",
                }}
              />
            </span>
            <span className="nums text-right text-xs text-muted-foreground">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
