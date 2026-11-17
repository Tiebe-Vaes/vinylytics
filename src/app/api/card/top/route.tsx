import { ImageResponse } from "next/og";
import { CARD_SIZES, CardFrame, cardFonts, cardFormat, coverData } from "@/lib/card";
import { inkHex } from "@/lib/ink";
import { isOwner } from "@/lib/owner";
import { publicAllows } from "@/lib/public";
import { topItems } from "@/lib/spotify/charts";
import { chartRange } from "@/lib/spotify/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES = { "4w": "Last 4 weeks", "6m": "Last 6 months", all: "All time" } as const;
type CardRange = keyof typeof RANGES;

/** Your top 5 artists or tracks as the back of a sleeve: the card people post instead of a stats.fm screenshot. */
export async function GET(req: Request) {
  if (!(await isOwner()) && !(await publicAllows("top"))) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind") === "track" ? "track" : "artist";
  const range: CardRange = (["4w", "6m", "all"] as const).find((r) => r === q.get("range")) ?? "4w";
  const format = cardFormat(q.get("format"));
  const window = chartRange(range);

  const items = await topItems({ kind, from: window?.from ?? null, to: window?.to ?? null, sort: "time", limit: 5 });
  if (items.length === 0) return new Response("Nothing to share yet", { status: 404 });
  const [fonts, cover] = await Promise.all([cardFonts(), coverData(items[0].cover)]);
  const story = format === "story";

  return new ImageResponse(
    (
      <CardFrame ink={inkHex("cobalt")} topLeft={RANGES[range]} cover={cover}>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontWeight: 900, fontSize: story ? 170 : 140, lineHeight: 0.85 }}>
          {kind === "artist" ? "TOP ARTISTS" : "TOP TRACKS"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: story ? 90 : 60, gap: story ? 34 : 24 }}>
          {items.map((item, i) => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <span style={{ fontFamily: "Big Shoulders", fontWeight: 900, fontSize: 96, width: 70, lineHeight: 1 }}>{i + 1}</span>
              <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
                <span style={{ fontSize: 50, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.name}</span>
                <span style={{ fontSize: 30 }}>
                  {item.subtitle ? `${item.subtitle} · ` : ""}
                  {Math.round(item.minutes / 60)} h
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardFrame>
    ),
    { ...CARD_SIZES[format], fonts, headers: { "Cache-Control": "private, max-age=300" } }
  );
}
