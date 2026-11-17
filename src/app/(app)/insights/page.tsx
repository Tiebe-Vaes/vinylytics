import Link from "next/link";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { hashInk, inkHex, inkText } from "@/lib/ink";
import { roastEmpty } from "@/lib/roast";
import { cachedInsights } from "@/lib/spotify/insights";

export const dynamic = "force-dynamic";

const shortDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
const trackHref = (uri: string) => `/track/${uri.split(":").at(-1)}`;
const artistHref = (name: string) => `/artist/${encodeURIComponent(name)}`;

function Line({ children }: { children: React.ReactNode }) {
  return <li className="flex min-w-0 items-baseline justify-between gap-3 border-t border-rule py-2.5 text-sm first:border-t-0">{children}</li>;
}

export default async function InsightsPage() {
  const i = await cachedInsights();
  const recent = i.newVsFamiliar.slice(-12);
  const empty = !i.bSides.length && !i.reissues.length && !recent.length && !i.artistStreaks.length;

  return (
    <>
      <PageHeader title="Insights" description="The stuff your charts are too polite to say." />
      {empty && <Empty>{roastEmpty("insights")}</Empty>}

      <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
        {i.onThisDay.length > 0 && (
          <Panel title="On this day" subtitle="Same date, earlier years. Remember who you were?">
            <ol>
              {i.onThisDay.map((o) => (
                <Line key={o.year}>
                  <span className="display text-2xl">{o.year}</span>
                  <span className="min-w-0 truncate text-right">
                    {o.topTrack ? `${o.topTrack.name}, ${o.topTrack.streams}×` : "Silence"}
                    {o.firstHeard.length > 0 && <span className="block truncate text-xs text-muted-text">first heard {o.firstHeard.map((f) => f.name).join(", ")}</span>}
                  </span>
                </Line>
              ))}
            </ol>
          </Panel>
        )}

        <Panel title="B-sides" subtitle="Once on heavy rotation. Then you just stopped. Cold.">
          {i.bSides.length === 0 ? <Empty>Nothing abandoned yet. Loyal, or just new here.</Empty> : (
            <ol>
              {i.bSides.map((b) => (
                <Line key={b.uri}>
                  <Link href={trackHref(b.uri)} className="min-w-0 truncate font-semibold hover:underline">{b.name} <span className="font-normal text-muted-text">· {b.artist}</span></Link>
                  <span className="nums shrink-0 text-muted-text">{b.streams}×, last {shortDate(b.lastPlay)}</span>
                </Line>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Reissues" subtitle="Songs you came crawling back to after half a year.">
          {i.reissues.length === 0 ? <Empty>No comebacks yet.</Empty> : (
            <ol>
              {i.reissues.map((r) => (
                <Line key={r.uri}>
                  <Link href={trackHref(r.uri)} className="min-w-0 truncate font-semibold hover:underline">{r.name} <span className="font-normal text-muted-text">· {r.artist}</span></Link>
                  <span className="nums shrink-0 text-muted-text">back after {r.gapDays} days</span>
                </Line>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="New vs familiar" subtitle="Share of minutes on tracks you first heard that month.">
          {recent.length === 0 ? <Empty>No months yet.</Empty> : (
            <ol className="flex h-40 items-end gap-1.5" aria-label="Share of new music per month">
              {recent.map((m) => {
                const total = m.newMinutes + m.familiarMinutes;
                const pct = total ? Math.round((m.newMinutes / total) * 100) : 0;
                return (
                  <li key={m.month} className="flex h-full flex-1 flex-col justify-end gap-1 text-center">
                    <span className="nums text-[10px] text-muted-text">{pct}%</span>
                    <span className="block w-full bg-ink-cobalt" style={{ height: `${Math.max(pct, 2)}%` }} aria-hidden />
                    <span className="text-[10px] text-muted-text">{monthLabel(m.month)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Stayers" subtitle="Artists you never really leave.">
          {i.loyalty.stayers.length === 0 ? <Empty>Give it six months.</Empty> : (
            <ol>
              {i.loyalty.stayers.map((s) => (
                <Line key={s.artist}>
                  <Link href={artistHref(s.artist)} className="min-w-0 truncate font-semibold hover:underline">{s.artist}</Link>
                  <span className="nums shrink-0 text-muted-text">{Math.round(s.activeMonthShare * 100)}% of months</span>
                </Line>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="One and done" subtitle="A month of obsession, then never again. We don't judge. We do count.">
          {i.loyalty.oneAndDone.length === 0 ? <Empty>No flings yet.</Empty> : (
            <ol>
              {i.loyalty.oneAndDone.map((o) => (
                <Line key={o.artist}>
                  <Link href={artistHref(o.artist)} className="min-w-0 truncate font-semibold hover:underline">{o.artist}</Link>
                  <span className="nums shrink-0 text-muted-text">{o.streams}× from {shortDate(o.firstPlay)}</span>
                </Line>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Album completion" subtitle="Albums you actually played front to back, like it's 1975.">
          {i.albumCompletion.length === 0 ? <Empty>Albums show up once tracks are looked up on Spotify.</Empty> : (
            <ol>
              {i.albumCompletion.map((a) => (
                <Line key={a.albumId}>
                  <Link href={`/album/${a.albumId}`} className="min-w-0 truncate font-semibold hover:underline">{a.name} <span className="font-normal text-muted-text">· {a.artist}</span></Link>
                  <span className="nums shrink-0 text-muted-text">{a.played}/{a.total}</span>
                </Line>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Streaks" subtitle="Most days in a row with one artist. Commitment issues? Not here.">
          {i.artistStreaks.length === 0 ? <Empty>No streaks yet.</Empty> : (
            <ol>
              {i.artistStreaks.map((s) => {
                const bg = inkHex(hashInk(s.artist));
                return (
                  <Line key={s.artist}>
                    <Link href={artistHref(s.artist)} className="min-w-0 truncate font-semibold hover:underline">{s.artist}</Link>
                    <span className="display shrink-0 px-2 py-1 text-xl" style={{ background: bg, color: inkText(bg) }}>
                      {s.days}d
                    </span>
                  </Line>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
