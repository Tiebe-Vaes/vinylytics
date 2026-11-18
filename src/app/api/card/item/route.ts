import { renderCard } from "@/lib/card";
import { isOwner } from "@/lib/owner";
import { itemMeta } from "@/lib/spotify/item-meta";
import { cachedItemStats, type ItemRef } from "@/lib/spotify/item-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const missing = () => new Response("Not found", { status: 404 });
  if (!(await isOwner())) return missing();
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind");
  const key = q.get("key");
  if (!key || key.length > 512) return missing();
  let ref: ItemRef;
  if (kind === "artist") ref = { kind, name: key };
  else if (kind === "track") ref = { kind, uri: key.startsWith("spotify:track:") ? key : `spotify:track:${key}` };
  else if (kind === "album") ref = { kind, albumId: key };
  else return missing();
  const meta = await itemMeta(ref);
  if (!meta) return missing();
  const stats = await cachedItemStats(ref);
  const rows = [{ label: "Plays", value: stats.streams.toLocaleString("en-GB") }];
  if (stats.allTimeRank) rows.push({ label: "All-time rank", value: `#${stats.allTimeRank}` });
  if (stats.peakWeek) rows.push({ label: "Peak week", value: `${stats.peakWeek.week} · ${Math.round(stats.peakWeek.minutes)} min` });
  return renderCard(req, {
    kind: "item", ink: "cobalt", edition: `LIBRARY  /  ${kind.toUpperCase()}`, title: meta.title,
    period: "All time", lead: meta.subtitle, cover: meta.cover, stat: `${Math.round(stats.minutes).toLocaleString("en-GB")} minutes`, rows,
  });
}
