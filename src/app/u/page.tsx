import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Empty, Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { Shelf } from "@/components/sleeve/shelf";
import type { ChartItem } from "@/lib/spotify/charts";
import { publicPayload } from "@/lib/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "A discography on Vinylytics", robots: { index: false, follow: false } };

function TopList({ title, items }: { title: string; items: ChartItem[] }) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <Empty>Nothing yet.</Empty>
      ) : (
        <ol>
          {items.map((item, i) => (
            <li key={item.key} className="flex items-center gap-3 border-t border-rule py-2.5 first:border-t-0">
              <span className="display w-7 text-2xl text-muted-text">{i + 1}</span>
              <Cover url={item.cover} size={40} alt={item.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{item.name}</div>
                {item.subtitle && <div className="truncate text-sm text-muted-text">{item.subtitle}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** The opt-in public view of this copy: read-only, only the sections the owner ticked. */
export default async function PublicPage() {
  const p = await publicPayload();
  if (!p) notFound();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
      <header className="flex items-end justify-between gap-4 border-b border-rule pb-4">
        <h1 className="display text-5xl">A discography</h1>
        <SpotifyAttribution />
      </header>

      {p.lastSpin && (
        <p className="text-sm text-muted-text">
          Last spin: <span className="font-semibold text-text">{p.lastSpin.name}</span> · {p.lastSpin.artist}
        </p>
      )}

      {p.eras && <Shelf eras={p.eras} linkable={false} />}

      {p.top && (
        <div className="grid gap-10 md:grid-cols-2">
          <TopList title="Top artists, 4 weeks" items={p.top.artists} />
          <TopList title="Top tracks, 4 weeks" items={p.top.tracks} />
        </div>
      )}

      {p.insights && (
        <div className="grid gap-10 md:grid-cols-2">
          <Panel title="B-sides">
            {p.insights.bSides.length === 0 ? <Empty>No abandoned favourites.</Empty> : (
              <ol>{p.insights.bSides.slice(0, 8).map((b) => <li key={b.uri} className="truncate border-t border-rule py-2 text-sm first:border-t-0">{b.name} · {b.artist}</li>)}</ol>
            )}
          </Panel>
          <Panel title="Streaks">
            {p.insights.artistStreaks.length === 0 ? <Empty>No streaks yet.</Empty> : (
              <ol>{p.insights.artistStreaks.slice(0, 8).map((s) => <li key={s.artist} className="flex justify-between border-t border-rule py-2 text-sm first:border-t-0"><span className="truncate">{s.artist}</span><span className="nums">{s.days} days</span></li>)}</ol>
            )}
          </Panel>
        </div>
      )}

      <footer className="border-t border-rule pt-4 text-xs text-muted-text">
        Pressed with Vinylytics, a self-hosted Spotify history.
      </footer>
    </main>
  );
}
