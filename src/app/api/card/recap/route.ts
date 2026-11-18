import { renderCard } from "@/lib/card";
import { isOwner } from "@/lib/owner";
import { getRecap } from "@/lib/spotify/recap";
import { localDateKey } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const missing = () => new Response("Not found", { status: 404 });
  if (!(await isOwner())) return missing();
  const year = Number(new URL(req.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2008 || year > Number(localDateKey().slice(0, 4))) return missing();
  const recap = await getRecap(year);
  if (!recap.minutes && !recap.plays) return missing();
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
