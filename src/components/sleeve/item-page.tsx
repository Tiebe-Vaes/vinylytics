import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Empty, Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { WeeklyBars } from "@/components/sleeve/weekly-bars";
import { hashInk, inkHex, inkText } from "@/lib/ink";
import { roastItem } from "@/lib/roast";
import { itemMeta } from "@/lib/spotify/item-meta";
import { cachedItemStats, type ItemRef } from "@/lib/spotify/item-stats";
import { timezone } from "@/lib/tz";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: timezone() });
const weekOf = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthName = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** The deep dive shared by artist, track and album pages: a sleeve-coloured header, the numbers, the weeks, the rank. */
export async function ItemPage({ refOf, inkSeed }: { refOf: ItemRef; inkSeed: string }) {
  const [meta, stats] = await Promise.all([itemMeta(refOf), cachedItemStats(refOf)]);
  if (!meta) notFound();

  const bg = inkHex(hashInk(inkSeed));
  const fg = inkText(bg);
  const facts: [string, string][] = [
    ["Total", `${Math.round(stats.minutes / 6) / 10} hours`],
    ["Streams", stats.streams.toLocaleString("en-GB")],
    ["First play", stats.firstPlay ? longDate(stats.firstPlay) : "Never streamed"],
    ["Peak week", stats.peakWeek ? `${weekOf(stats.peakWeek.week)}, ${Math.round(stats.peakWeek.minutes)} min` : "None yet"],
    ["All-time rank", stats.allTimeRank ? `#${stats.allTimeRank}` : "Unranked"],
  ];

  return (
    <article className="flex flex-col gap-10">
      <header className="-mx-4 flex flex-col gap-5 px-4 pt-8 pb-6 md:mx-0 md:p-8" style={{ background: bg, color: fg }}>
        <div className="flex items-end justify-between gap-4">
          <h1 className="display min-w-0 text-[clamp(44px,12vw,96px)]">{meta.title}</h1>
          <Cover url={meta.cover} size={88} alt={meta.title} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
          <span>{meta.subtitle}</span>
          {meta.spotifyUrl && (
            <a href={meta.spotifyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
              Open in Spotify <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </header>

      <p className="max-w-prose text-lg leading-snug text-balance">
        {roastItem({ name: meta.title, streams: stats.streams, peakWeekMinutes: stats.peakWeek?.minutes ?? 0, weeksPlayed: stats.weekly.length })}
      </p>

      <div className="grid gap-10 md:grid-cols-[2fr_3fr]">
        <Panel title="The numbers" action={<SpotifyAttribution />}>
          <dl>
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-t border-rule py-2.5 text-sm first:border-t-0">
                <dt className="text-muted-text">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Week by week">
          {stats.weekly.length === 0 ? <Empty>No plays yet.</Empty> : <WeeklyBars weekly={stats.weekly} ink={bg} />}
        </Panel>
      </div>

      <Panel title="Rank by month" subtitle="Where it placed among everything you played that month">
        {stats.rankByMonth.length === 0 ? (
          <Empty>No months to rank yet.</Empty>
        ) : (
          <ol className="flex flex-wrap gap-x-6 gap-y-2">
            {[...stats.rankByMonth].reverse().map((m) => (
              <li key={m.month} className="flex items-baseline gap-2 text-sm">
                <span className="display text-2xl">#{m.rank}</span>
                <span className="text-muted-text">{monthName(m.month)}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </article>
  );
}
