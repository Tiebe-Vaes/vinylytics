import Link from "next/link";
import { ArrowUpRight, SkipForward } from "lucide-react";
import { Empty, PageHeader } from "@/components/panel";
import { roastEmpty } from "@/lib/roast";
import { historyDayPage, historyPage, listeningDays, validHistoryDay, type HistoryPlay, type ListeningDay } from "@/lib/spotify/history";
import { clock, humanDuration, localDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const dayTitle = (key: string, today: string) => {
  if (key === today) return "Today";
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

function DayFacts({ day }: { day: ListeningDay }) {
  return (
    <>
      <p className="nums text-sm font-semibold">{humanDuration(Math.round(day.minutes))} · {day.plays} {day.plays === 1 ? "play" : "plays"}</p>
      {(day.topTrack || day.topArtist) && (
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {day.topTrack && <div><dt className="text-xs text-muted-text">Favourite song</dt><dd className="break-words font-semibold">{day.topTrack}</dd></div>}
          {day.topArtist && <div><dt className="text-xs text-muted-text">Favourite artist</dt><dd className="break-words font-semibold">{day.topArtist}</dd></div>}
        </dl>
      )}
    </>
  );
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const params = await searchParams;
  const before = typeof params.before === "string" ? params.before : null;
  const selected = validHistoryDay(params.day) ? params.day : undefined;
  const today = localDateKey();
  // Older play-by-play bookmarks used only the composite cursor.
  const raw = params.view === "plays" || Boolean(before?.includes("~"));
  if (!selected && !raw) {
    const { days, next } = await historyDayPage(before);
    return (
      <>
        <PageHeader title="History" description="Your listening, one day at a time." actions={<Link className="p-2 text-sm font-semibold underline" href="/history?view=plays">All plays</Link>} />
        {days.length === 0 && <Empty>{roastEmpty("history")}</Empty>}
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {days.map((day) => (
            <li key={day.day} className="border-t border-rule">
              <Link href={`/history?day=${day.day}`} className="group block py-5 transition-colors hover:bg-raised">
                <h2 className="display mb-3 flex items-start justify-between gap-3 text-3xl">
                  {dayTitle(day.day, today)}
                  <ArrowUpRight className="size-5 shrink-0 text-muted-text transition-transform group-hover:-translate-y-0.5" aria-hidden />
                </h2>
                <DayFacts day={day} />
              </Link>
            </li>
          ))}
        </ol>
        {next && <Link className="mt-5 inline-block py-3 font-semibold underline" href={`/history?before=${next}`}>Older days</Link>}
      </>
    );
  }

  const [{ plays, next }, summary] = await Promise.all([
    historyPage(before, selected ? 10 : 100, selected),
    selected ? listeningDays(selected, selected) : [],
  ]);

  const days = new Map<string, HistoryPlay[]>();
  for (const p of plays) {
    const key = localDateKey(new Date(p.playedAt));
    const entries = days.get(key);
    if (entries) entries.push(p);
    else days.set(key, [p]);
  }

  return (
    <>
      <PageHeader title={selected ? dayTitle(selected, today) : "All plays"} actions={<Link href="/history" className="p-2 text-sm font-semibold underline">Browse days</Link>} />
      {summary[0] && <div className="mb-6 border-y border-rule py-4"><DayFacts day={summary[0]} /></div>}
      {plays.length === 0 && <Empty>{selected ? "No music plays logged for this day." : roastEmpty("history")}</Empty>}
      <div className="flex flex-col gap-8">
        {[...days].map(([day, list]) => (
          <section key={day} aria-label={dayTitle(day, today)}>
            <h2 className="display mb-2 text-2xl">{selected ? "Play log" : dayTitle(day, today)}</h2>
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
        <Link href={`/history?${selected ? "day=" + selected : "view=plays"}&before=${encodeURIComponent(next)}`} className="mt-8 inline-block text-sm font-semibold underline">
          Load older plays
        </Link>
      )}
    </>
  );
}
