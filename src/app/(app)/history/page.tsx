import Link from "next/link";
import { ArrowUpRight, SkipForward } from "lucide-react";
import { Empty, PageHeader } from "@/components/panel";
import { roastEmpty } from "@/lib/roast";
import { historyDayPage, historyPage, listeningDays, validHistoryDay, type HistoryPlay, type ListeningDay } from "@/lib/spotify/history";
import { addDaysKey, clock, humanDuration, localDateKey } from "@/lib/time";
import { DayPicker } from "@/components/music/day-picker";
import { MonthStrip } from "@/components/music/month-strip";
import { dayPresets } from "@/lib/spotify/day-presets";
import { firstListeningYear } from "@/lib/spotify/recap";

/** The date jump shown on every History view: strip for the month, picker for anywhere. */
async function DateJump({ selected, today }: { selected?: string; today: string }) {
  const month = (selected ?? today).slice(0, 7);
  const monthEnd = addDaysKey(`${month}-01`, 31).slice(0, 7) + "-01";
  // Dots for the last two years; older months still open, without dots.
  const since = `${Number(today.slice(0, 4)) - 1}-01-01`;
  const [monthDays, recent, firstYear] = await Promise.all([
    listeningDays(`${month}-01`, addDaysKey(monthEnd, -1)), listeningDays(since, today), firstListeningYear(Number(today.slice(0, 4))),
  ]);
  return {
    strip: <MonthStrip days={monthDays} month={month} selected={selected} today={today} />,
    picker: <DayPicker value={selected ?? today} min={`${firstYear}-01-01`} max={today} presets={dayPresets(today)}
      activeDays={recent.filter((d) => d.minutes > 0).map((d) => d.day)} />,
  };
}

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
    const [{ days, next }, jump] = await Promise.all([historyDayPage(before), DateJump({ today })]);
    return (
      <>
        <PageHeader title="History" description="Your listening, one day at a time." actions={<>{jump.picker}<Link className="p-2 text-sm font-semibold underline" href="/history?view=plays">All plays</Link></>} />
        {jump.strip}
        {days.length === 0 && <Empty>{roastEmpty("history")}</Empty>}
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {days.map((day) => (
            <li key={day.day} className="border-t border-rule">
              <Link href={`/history?day=${day.day}`} className="group block px-2 py-5 transition-colors duration-200 hover:bg-raised">
                <h2 className="display mb-3 flex items-start justify-between gap-3 text-3xl">
                  {dayTitle(day.day, today)}
                  <ArrowUpRight className="hover-reveal size-5 shrink-0 text-muted-text group-hover:-translate-y-0.5" aria-hidden />
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

  const [{ plays, next }, summary, jump] = await Promise.all([
    historyPage(before, selected ? 10 : 100, selected),
    selected ? listeningDays(selected, selected) : [],
    DateJump({ selected, today }),
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
      <PageHeader title={selected ? dayTitle(selected, today) : "All plays"} actions={<>{jump.picker}<Link href="/history" className="p-2 text-sm font-semibold underline">Browse days</Link></>} />
      {selected && jump.strip}
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
