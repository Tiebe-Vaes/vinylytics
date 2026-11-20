import { renderCard } from "@/lib/card";
import { isOwner } from "@/lib/owner";
import { publicAllows } from "@/lib/public";
import { getEraDetail } from "@/lib/spotify/era-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const date = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const missing = () => new Response("Not found", { status: 404 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return missing();
  const owner = await isOwner();
  if (!owner && !(await publicAllows("eras"))) return missing();
  const detail = await getEraDetail(id);
  if (!detail) return missing();
  const { era, tracks, weekly } = detail;
  return renderCard(req, {
    kind: "era", ink: era.ink, edition: `ERA  /  ${era.weeks} WEEKS`,
    title: era.name, period: `${date(era.start)} – ${date(era.end)}`, lead: era.lead, cover: era.cover,
    stat: `${Math.round(era.minutes / 60).toLocaleString("en-GB")} hours`, ranked: true,
    rows: owner ? tracks.map((t) => ({ label: t.name, value: t.artist })) : [],
    series: weekly, badge: `${Math.round(era.minutes / 60)}H`, caption: "ON REPEAT",
  });
}
