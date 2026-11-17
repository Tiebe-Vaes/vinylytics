import { ImageResponse } from "next/og";
import { CARD_SIZES, CardFrame, cardFonts, cardFormat, coverData, eraTitleSize } from "@/lib/card";
import { inkHex } from "@/lib/ink";
import { isOwner } from "@/lib/owner";
import { publicAllows } from "@/lib/public";
import { getEraDetail } from "@/lib/spotify/era-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const monthYear = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/** An era pressed as a share card: the sleeve front with side A on it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Era ids are Monday dates; anything else would only fill the cache with misses.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return new Response("Not found", { status: 404 });
  // Not yours (and not public): same answer as missing, so ids don't leak.
  if (!(await isOwner()) && !(await publicAllows("eras"))) return new Response("Not found", { status: 404 });
  const detail = await getEraDetail(id);
  if (!detail) return new Response("Not found", { status: 404 });

  const { era, tracks } = detail;
  const format = cardFormat(new URL(req.url).searchParams.get("format"));
  const [fonts, cover] = await Promise.all([cardFonts(), coverData(era.cover)]);
  const hours = Math.round(era.minutes / 60);
  const story = format === "story";

  return new ImageResponse(
    (
      <CardFrame ink={inkHex(era.ink)} period={`${monthYear(era.start)} – ${monthYear(era.end)}`} catalogue={`VNL ${era.start.slice(2, 4)}${era.start.slice(5, 7)} · SIDE A`} cover={cover}>
        <div style={{ display: "flex", alignItems: "flex-start", fontFamily: "Big Shoulders", fontWeight: 900, fontSize: (story ? 360 : 300) * (era.name.length > 28 ? 0.7 : 1), lineHeight: 0.85 }}>
          {hours}
          <span style={{ fontSize: 110, marginLeft: 8 }}>H</span>
        </div>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontWeight: 900, fontSize: eraTitleSize(era.name, story), lineHeight: 0.88, textTransform: "uppercase", marginTop: 20 }}>
          {era.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: story ? 80 : 50, gap: 10 }}>
          {tracks.slice(0, story ? 6 : 5).map((t, i) => (
            <div key={t.uri} style={{ display: "flex", fontSize: 34, gap: 24 }}>
              <span style={{ fontFamily: "Big Shoulders", fontWeight: 900, width: 60 }}>A{i + 1}</span>
              <span style={{ fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 800 }}>
                {t.name} · {t.artist}
              </span>
            </div>
          ))}
        </div>
      </CardFrame>
    ),
    { ...CARD_SIZES[format], fonts, headers: { "Cache-Control": "private, no-store" } }
  );
}
