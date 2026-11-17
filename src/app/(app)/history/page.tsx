import Link from "next/link";
import { SkipForward } from "lucide-react";
import { Empty, PageHeader } from "@/components/panel";
import { roastEmpty } from "@/lib/roast";
import { historyPage, type HistoryPlay } from "@/lib/spotify/history";
import { clock, localDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const dayTitle = (key: string, today: string) => {
  if (key === today) return "Today";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const { plays, next } = await historyPage(before ?? null);
  const today = localDateKey();

  const days = new Map<string, HistoryPlay[]>();
  for (const p of plays) {
    const key = localDateKey(new Date(p.playedAt));
    days.set(key, [...(days.get(key) ?? []), p]);
  }

  return (
    <>
      <PageHeader title="History" description="Every play, newest first." />
      {plays.length === 0 && <Empty>{roastEmpty("history")}</Empty>}
      <div className="flex flex-col gap-8">
        {[...days].map(([day, list]) => (
          <section key={day} aria-label={dayTitle(day, today)}>
            <h2 className="display mb-2 text-2xl">{dayTitle(day, today)}</h2>
            <ol>
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-t border-rule py-2 text-sm">
                  <span className="nums w-12 shrink-0 text-muted-text">{clock(new Date(p.playedAt))}</span>
                  <div className="min-w-0 flex-1">
                    {p.uri?.startsWith("spotify:track:") ? (
                      <Link href={`/track/${p.uri.split(":")[2]}`} className="block truncate font-semibold hover:underline">
                        {p.name ?? "Unknown track"}
                      </Link>
                    ) : (
                      <span className="block truncate font-semibold">{p.name ?? "Local file"}</span>
                    )}
                    {p.artist && (
                      <Link href={`/artist/${encodeURIComponent(p.artist)}`} className="block truncate text-muted-text hover:underline">
                        {p.artist}
                      </Link>
                    )}
                  </div>
                  {p.skipped && (
                    <span className="flex items-center gap-1 text-xs text-muted-text" title="Skipped">
                      <SkipForward className="size-3.5" strokeWidth={2} aria-hidden />
                      <span className="sr-only">Skipped</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {next && (
        <Link href={`/history?before=${encodeURIComponent(next)}`} className="mt-8 inline-block text-sm font-semibold underline">
          Load older plays
        </Link>
      )}
    </>
  );
}
