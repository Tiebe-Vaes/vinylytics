import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { ShareButton } from "@/components/sleeve/share-button";
import { eraHours, eraSpan, Sleeve } from "@/components/sleeve/sleeve";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/toaster";
import { getEraDetail } from "@/lib/spotify/era-detail";
import { inkHex } from "@/lib/ink";
import { mergeWithNext, renameEra } from "../actions";

export const dynamic = "force-dynamic";

const longDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function EraPage({ params }: PageProps<"/eras/[id]">) {
  const { id } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) notFound();
  const detail = await getEraDetail(id);
  if (!detail) notFound();
  const { era, next, tracks, topDay, firstTrack, closer, peakWeek, sides } = detail;
  const credits = [
    ["Running time", `${eraHours(era)} hours over ${era.weeks} weeks`],
    ["First song", firstTrack ? `${firstTrack.name} · ${firstTrack.artist}` : "—"],
    ["Peak week", `Week ${peakWeek.index + 1} · ${peakWeek.minutes} min`],
    ["The closer", closer ? `${closer.name} · ${closer.artist}` : "—"],
    ["Featuring", era.artists.map((a) => a.name).join(", ")],
    ["Biggest day", `${longDate(topDay.day)} · ${Math.round(topDay.minutes)} min`],
  ];
  const side = (label: string, list: typeof tracks) => (
    <div>
      <h3 className="display mb-1 text-xl">Side {label}</h3>
      <ol>{list.map((track, i) => (
        <li key={track.uri} className="group flex items-center gap-3 border-t border-rule py-2.5">
          <span aria-hidden="true" className="display w-9 shrink-0 text-xl text-muted-text">{label}{i + 1}</span>
          <Cover url={track.cover} size={40} alt="" />
          <div className="min-w-0 flex-1">
            <Link href={`/track/${encodeURIComponent(track.uri.split(":").at(-1)!)}`} className="link-underline block truncate font-semibold">{track.name}</Link>
            <Link href={`/artist/${encodeURIComponent(track.artist)}`} className="block truncate text-sm text-muted-text hover:underline">{track.artist}</Link>
          </div>
          <span className="nums shrink-0 text-sm text-muted-text">{track.streams}×</span>
        </li>
      ))}</ol>
    </div>
  );

  return (
    <article className="grid gap-8">
      <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
        <Sleeve era={era} size="hero" href={null} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-text">{eraSpan(era)}</p>
          <h1 className="display my-4 text-5xl md:text-7xl">{era.name}</h1>
          <p className="text-lg text-muted-text">{era.lead} led these {era.weeks} weeks on repeat.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ShareButton href={`/api/card/era/${era.id}`} filename={`vinylytics-${era.id}.png`} title={era.name} defaultInk={era.ink}
              preview={{ cover: "Era artwork", period: eraSpan(era), lead: era.lead, stat: `${Math.round(era.minutes).toLocaleString("en-GB")} minutes`, rows: `Side A: ${sides.a.map((t) => t.name).slice(0, 2).join(", ")}…` }} />
            <a href="#edit-era" className="inline-flex min-h-11 items-center gap-2 border border-strong px-3 text-sm font-semibold hover:bg-raised">
              <Pencil size={16} aria-hidden="true" />Edit this era
            </a>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-8 md:grid-cols-2">
        <Panel title="Tracklist">
          {tracks.length ? <div className="grid gap-6">{side("A", sides.a)}{sides.b.length > 0 && side("B", sides.b)}</div>
            : <p className="text-sm text-muted-text">No tracks in this era.</p>}
        </Panel>

        <div className="grid gap-8">
          <Panel title="Liner notes" action={<SpotifyAttribution />}>
            <dl className="border-l-4 pl-4" style={{ borderColor: inkHex(era.ink) }}>{credits.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-rule py-3 text-sm">
                <dt className="text-muted-text">{label}</dt><dd className="min-w-0 font-semibold break-words">{value}</dd>
              </div>
            ))}</dl>
          </Panel>
          <section id="edit-era" tabIndex={-1} className="scroll-mt-6">
            <Panel title="Edit this era">
              <ActionForm action={renameEra} success="Era renamed">
                <input type="hidden" name="eraId" value={era.id} />
                <label htmlFor="era-name" className="text-sm font-semibold">Era name</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input id="era-name" name="name" required defaultValue={era.name} maxLength={80} pattern={".*\\S.*"}
                    title="Use at least one non-space character." className="min-h-11 min-w-0 flex-1 border border-input bg-ground px-2 text-sm" />
                  <Button className="min-h-11" type="submit">Save name</Button>
                </div>
              </ActionForm>
              {next && <ActionForm action={mergeWithNext} success="Eras merged" className="mt-5 border-t border-rule pt-4">
                <input type="hidden" name="eraId" value={era.id} /><input type="hidden" name="nextEraId" value={next.id} />
                <Button variant="outline" type="submit" className="h-auto min-h-11 max-w-full whitespace-normal">Merge with {next.name}</Button>
              </ActionForm>}
            </Panel>
          </section>
        </div>
      </div>
    </article>
  );
}
