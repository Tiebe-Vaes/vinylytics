import Link from "next/link";
import { notFound } from "next/navigation";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Panel } from "@/components/panel";
import { Cover } from "@/components/sleeve/cover";
import { ShareButton } from "@/components/sleeve/share-button";
import { eraHours, eraSpan, Sleeve } from "@/components/sleeve/sleeve";
import { Button } from "@/components/ui/button";
import { roastEra } from "@/lib/roast";
import { getEraDetail, type EraTrack } from "@/lib/spotify/era-detail";
import { mergeWithNext, renameEra } from "../actions";

export const dynamic = "force-dynamic";

const trackId = (uri: string) => uri.split(":").at(-1)!;
const longDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Side({ label, tracks, offset }: { label: "A" | "B"; tracks: EraTrack[]; offset: number }) {
  if (tracks.length === 0) return null;
  return (
    <section aria-label={`Side ${label}`}>
      <h3 className="display mb-2 text-xl text-muted-text">Side {label}</h3>
      <ol>
        {tracks.map((t, i) => (
          <li key={t.uri} className="flex items-center gap-3 border-t border-rule py-2.5">
            <span className="display w-8 shrink-0 text-xl text-muted-text">
              {label}
              {i + 1 + offset - (label === "B" ? 6 : 0)}
            </span>
            <Cover url={t.cover} size={40} alt={`Cover of ${t.name}`} />
            <div className="min-w-0 flex-1">
              <Link href={`/track/${trackId(t.uri)}`} className="block truncate font-semibold hover:underline">
                {t.name}
              </Link>
              <Link href={`/artist/${encodeURIComponent(t.artist)}`} className="block truncate text-sm text-muted-text hover:underline">
                {t.artist}
              </Link>
            </div>
            <span className="nums shrink-0 text-sm text-muted-text">{t.streams}×</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function EraPage({ params }: PageProps<"/eras/[id]">) {
  const { id } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) notFound();
  const detail = await getEraDetail(id);
  if (!detail) notFound();
  const { era, next, tracks, firstHeard, newArtists, topDay } = detail;

  const credits: [string, string][] = [
    ["Running time", `${eraHours(era)} hours over ${era.weeks} weeks`],
    ["Pressed", eraSpan(era)],
    ["Featuring", era.artists.map((a) => a.name).join(", ")],
    ["First heard here", `${firstHeard} tracks, ${newArtists} new artists`],
    ["Biggest day", `${longDate(topDay.day)}, ${Math.round(topDay.minutes)} min`],
  ];

  return (
    <article className="flex flex-col gap-10">
      <div className="mx-auto w-full max-w-md">
        <Sleeve era={era} size="hero" href={null} />
      </div>

      <div className="mx-auto flex max-w-prose flex-col items-center gap-4">
        <p className="text-center text-lg leading-snug text-balance">{roastEra(era)}</p>
        <div className="flex gap-2">
          <ShareButton href={`/api/card/era/${era.id}`} filename={`vinylytics-${era.id}.png`} label="Share sleeve" />
          <ShareButton href={`/api/card/era/${era.id}?format=story`} filename={`vinylytics-${era.id}-story.png`} label="Story" />
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Side label="A" tracks={tracks.slice(0, 6)} offset={0} />
          <Side label="B" tracks={tracks.slice(6, 12)} offset={6} />
        </div>

        <Panel title="Liner notes" action={<SpotifyAttribution />}>
          <dl className="flex flex-col">
            {credits.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 border-t border-rule py-2.5 text-sm first:border-t-0">
                <dt className="text-muted-text">{k}</dt>
                <dd className="min-w-0 font-semibold break-words">{v}</dd>
              </div>
            ))}
          </dl>

          <details className="mt-6 border-t border-rule pt-4">
            <summary className="cursor-pointer text-sm font-semibold">Edit this era</summary>
            <form action={renameEra} className="mt-4 flex gap-2">
              <input type="hidden" name="eraId" value={era.id} />
              <input
                name="name"
                required
                defaultValue={era.renamedBy ? era.name : ""}
                placeholder="Name this era"
                maxLength={80}
                pattern={".*\\S.*"}
                title="Use at least one non-space character."
                aria-label="Era name"
                className="h-9 min-w-0 flex-1 rounded-[2px] border border-input bg-ground px-2 text-sm"
              />
              <Button size="sm" type="submit">Save name</Button>
            </form>
            {next && (
              <form action={mergeWithNext} className="mt-3">
                <input type="hidden" name="eraId" value={era.id} />
                <input type="hidden" name="nextEraId" value={next.id} />
                <Button size="sm" variant="outline" type="submit">
                  Merge with {next.name}
                </Button>
              </form>
            )}
          </details>
        </Panel>
      </div>
    </article>
  );
}
