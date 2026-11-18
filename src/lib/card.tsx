import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { demoAllowed } from "@/lib/env";
import { ImageResponse } from "next/og";
import { inkHex, inkText, type InkId } from "@/lib/ink";
import { CARD_SIZES, cardOptions, type CardKind } from "@/lib/card-options";
import { fetchCover } from "@/lib/spotify/cover-image";

/**
 * Share cards: PNGs drawn by next/og (Satori). Satori reads TTF/OTF/WOFF, not
 * WOFF2, so the faces come from the @fontsource packages' .woff files.
 */

export type CardFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 900; style: "normal" };

const FONTS: [string, string, CardFont["weight"]][] = [
  ["Big Shoulders", "@fontsource/big-shoulders/files/big-shoulders-latin-900-normal.woff", 900],
  ["Archivo", "@fontsource/archivo/files/archivo-latin-400-normal.woff", 400],
  ["Archivo", "@fontsource/archivo/files/archivo-latin-600-normal.woff", 600],
];

let fonts: Promise<CardFont[]> | null = null;

export function cardFonts(): Promise<CardFont[]> {
  fonts ??= Promise.all(
    FONTS.map(async ([name, file, weight]) => {
      const buf = await readFile(path.join(process.cwd(), "node_modules", file));
      return { name, weight, style: "normal" as const, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    })
  ).catch((error) => {
    fonts = null;
    throw error;
  });
  return fonts;
}

/** A cover as a data URI for the card, or null when it can't be fetched within 3 s (the card then goes without). */
export async function coverData(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const cover = await fetchCover(url);
  if (!cover) return null;
  try {
    // Decode before Satori starts streaming. Corrupt or unsupported art must still yield a finished card.
    const bytes = await sharp(cover.data, { limitInputPixels: 24_000_000 })
      .rotate().resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Font size for an era name on a card. Names run up to 80 characters and
 * Satori doesn't shrink-to-fit, so step the size down by length.
 */
export function eraTitleSize(name: string, story: boolean): number {
  const n = name.length;
  const base = n <= 16 ? 120 : n <= 28 ? 96 : n <= 44 ? 72 : 56;
  return story ? Math.round(base * 1.25) : base;
}

export type CardContent = {
  kind: CardKind;
  ink: InkId;
  edition: string;
  title: string;
  period: string;
  lead?: string | null;
  cover?: string | null;
  stat?: string;
  rows?: { label: string; value?: string; fraction?: number }[];
  ranked?: boolean;
};

const display = { fontFamily: "Big Shoulders", fontWeight: 900 as const, textTransform: "uppercase" as const };
const singleLine = { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } as const;

/** The response itself is used for both preview and export. */
export async function renderCard(req: Request, card: CardContent) {
  const { format, ink, fields } = cardOptions(new URL(req.url).searchParams, card.kind, card.ink);
  const story = format === "story";
  const [fonts, artwork] = await Promise.all([cardFonts(), fields.includes("cover") ? coverData(card.cover) : null]);
  const bg = inkHex(ink);
  const fg = inkText(bg);
  const rows = fields.includes("rows") ? (card.rows ?? []).slice(0, 5) : [];
  const coverSize = rows.length ? (story ? 500 : 274) : (story ? 760 : 552);
  const title = card.title.trim() || "Untitled";
  const fontSize = Math.round(eraTitleSize(title, story) * (!artwork && !rows.length ? 1.45 : 1));

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", padding: 64, width: "100%", height: "100%", background: bg, color: fg, fontFamily: "Archivo" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `10px solid ${fg}`, borderBottom: `2px solid ${fg}`, padding: "14px 0" }}>
        <span style={{ ...display, fontSize: 38 }}>VINYLYTICS</span>
        <span style={{ fontSize: 23, fontWeight: 600 }}>{card.edition}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: story ? 28 : 18 }}>
        {artwork && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders an embedded image into the PNG.
          <img src={artwork} alt="" width={coverSize} height={coverSize} style={{ objectFit: "contain", alignSelf: "flex-end" }} />
        )}
        <div style={{ ...display, display: "flex", fontSize, lineHeight: 0.99, maxWidth: 948, wordBreak: "break-word", ...(card.kind === "era" ? {} : { lineClamp: 4 }) }}>{title}</div>
        {fields.includes("lead") && card.lead && <span style={{ ...singleLine, fontSize: 37, fontWeight: 600 }}>{card.lead}</span>}
        {fields.includes("stat") && card.stat && <span style={{ ...display, fontSize: story ? 78 : 62 }}>{card.stat}</span>}
        {rows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", borderTop: `3px solid ${fg}` }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${fg}`, padding: story ? "12px 0" : "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {card.ranked && <span style={{ ...display, width: 42, fontSize: 39 }}>{i + 1}</span>}
                  <span style={{ ...singleLine, flex: 1, fontWeight: 600, fontSize: 34 }}>{row.label}</span>
                  {row.value && <span style={{ ...singleLine, maxWidth: 470, fontSize: 32 }}>{row.value}</span>}
                </div>
                {row.fraction != null && <div style={{ width: `${Math.max(0, Math.min(1, row.fraction)) * 100}%`, height: 5, background: fg }} />}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `3px solid ${fg}`, paddingTop: 18, fontSize: 29, fontWeight: 600 }}>
        <span>{fields.includes("period") ? card.period : ""}</span>
        <span>{demoAllowed() ? "Synthetic demo history" : "Data from Spotify"}</span>
      </div>
    </div>,
    { ...CARD_SIZES[format], fonts, headers: { "Cache-Control": "private, no-store" } }
  );
}
