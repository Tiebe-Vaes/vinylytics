import { coverData, renderCard } from "@/lib/card";
import { cardOptions } from "@/lib/card-options";
import { isOwner } from "@/lib/owner";
import { publicAllows } from "@/lib/public";
import { parseChartFilters } from "@/lib/spotify/chart-filters";
import { cachedTop, topItems } from "@/lib/spotify/charts";
import { CHART_RANGES } from "@/lib/spotify/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const owner = await isOwner();
  if (!owner && !(await publicAllows("top"))) return new Response("Not found", { status: 404 });
  const params = new URL(req.url).searchParams;
  if (!owner && params.get("kind") === "album") return new Response("Not found", { status: 404 });
  const filters = parseChartFilters(owner ? params : new URLSearchParams({ kind: params.get("kind") === "track" ? "track" : "artist", range: "4w" }));
  if (!filters.valid) return new Response("Invalid chart dates", { status: 400 });
  const { kind, sort, range, window } = filters;
  const mosaic = cardOptions(params, "top", "cobalt").visual === "mosaic";
  const limit = mosaic ? 9 : 5;
  const items = owner
    ? await topItems({ kind, sort, from: window?.from ?? null, to: window?.to ?? null, limit })
    : await cachedTop(kind === "track" ? "track" : "artist", "4w", limit);
  if (!items.length) return new Response("Nothing to share yet", { status: 404 });
  const value = (item: typeof items[number]) => sort === "plays" ? item.streams : Math.round(item.minutes);
  const units = sort === "plays" ? "plays" : "min";
  // Same nouns as the Charts tabs; songs and albums carry their artist so equal titles stay distinct.
  const noun = { artist: "artists", track: "songs", album: "albums" }[kind];
  const named = (item: typeof items[number]) => item.subtitle ? `${item.name} · ${item.subtitle}` : item.name;
  // Cover fetches are bounded (3 s, size-capped) and run in parallel.
  const covers = mosaic ? await Promise.all(items.map((item) => coverData(item.cover))) : undefined;
  const top5 = items.slice(0, 5);
  return renderCard(req, {
    kind: "top", ink: "cobalt", edition: "RANKING  /  TOP FIVE",
    title: `Top ${noun}`, period: range === "custom" ? `${filters.from} – ${filters.to}` : CHART_RANGES.find((r) => r.value === range)!.label,
    lead: named(items[0]), cover: items[0].cover, stat: `${value(items[0])} ${units} at number one`,
    ranked: true, series: top5.map(value), covers, badge: value(items[0]).toLocaleString("en-GB"),
    caption: `${sort === "plays" ? "PLAYS" : "MINUTES"} AT NO. 1`, rows: top5.map((item) => ({
      label: named(item), value: `${value(item)} ${units}`, fraction: value(item) / Math.max(1, value(items[0])),
    })),
  });
}
