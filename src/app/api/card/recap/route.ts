import { renderCard, renderSpec } from "@/lib/card";
import { MAX_COMBO } from "@/lib/card-spec";
import { isOwner } from "@/lib/owner";
import { getRecap } from "@/lib/spotify/recap";
import { getRecapExtras } from "@/lib/spotify/recap-extras";
import { recapSlides, slideCard } from "@/lib/spotify/recap-slides";
import { localDateKey } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The year recap as a card: `slide=<id>` one stat, `slides=a,b,c` a combo of up
 * to four, `slide=poster` the festival lineup, nothing the yearly summary.
 */
export async function GET(req: Request) {
  const missing = () => new Response("Not found", { status: 404 });
  if (!(await isOwner())) return missing();
  const q = new URL(req.url).searchParams;
  const year = Number(q.get("year"));
  if (!Number.isInteger(year) || year < 2008 || year > Number(localDateKey().slice(0, 4))) return missing();
  const recap = await getRecap(year);
  if (!recap.minutes && !recap.plays) return missing();

  const slideId = q.get("slide");
  const comboIds = q.get("slides")?.split(",").filter(Boolean) ?? [];
  if (slideId || comboIds.length) {
    const extras = await getRecapExtras(year);
    if (slideId === "poster") {
      const artists = (extras?.topArtists ?? []).map((a) => ({ name: a.name, minutes: a.minutes }));
      if (!artists.length) return missing();
      return renderSpec(req, { type: "poster", year, ink: "plum", artists, minutes: recap.minutes, streak: recap.longestStreak });
    }
    const slides = recapSlides(recap, extras);
    if (comboIds.length > 1) {
      const tiles = comboIds.slice(0, MAX_COMBO).map((id) => slides.find((s) => s.id === id)).filter((s) => s !== undefined);
      if (tiles.length < 2) return missing();
      return renderSpec(req, { type: "combo", year, ink: "cobalt", tiles: tiles.map(({ id, kicker, headline, detail, ink }) => ({ id, kicker, headline, detail, ink })) });
    }
    const slide = slides.find((s) => s.id === (slideId ?? comboIds[0]));
    if (!slide) return missing();
    return renderCard(req, slideCard(slide, year, recap.artist?.imageUrl));
  }

  const rows = [{ label: "Days listening", value: String(recap.activeDays) }];
  if (recap.track) rows.push({ label: "Favourite song", value: recap.track.name });
  if (recap.peakHour != null) rows.push({ label: "Peak listening hour", value: `${String(recap.peakHour).padStart(2, "0")}:00` });
  if (recap.longestStreak) rows.push({ label: "Longest streak", value: `${recap.longestStreak} days` });
  return renderCard(req, {
    kind: "recap", ink: "cobalt", edition: "ANNUAL  /  RECAP", title: "My year in music", period: String(year),
    lead: recap.artist ? `Top artist · ${recap.artist.name}` : null, cover: recap.artist?.imageUrl ?? recap.track?.imageUrl,
    stat: `${Math.round(recap.minutes).toLocaleString("en-GB")} minutes`, rows,
    series: recap.days.map((d) => d.minutes), badge: Math.round(recap.minutes).toLocaleString("en-GB"), caption: "MINUTES",
  });
}
