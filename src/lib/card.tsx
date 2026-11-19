import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { fetchCover } from "@/lib/spotify/cover-image";
import { CARD_FONT_FILES, cardLayout, cardWantsCover, type CardContent, type CardFont } from "@/lib/card-layout";

/**
 * Share cards on the server: PNGs drawn by next/og (Satori) from the shared
 * layout in lib/card-layout.tsx. The browser build swaps this module for
 * src/browser/card.tsx (see next.config.ts).
 */

export { cardFooter, eraTitleSize, type CardContent, type CardFont } from "@/lib/card-layout";

let fonts: Promise<CardFont[]> | null = null;

export function cardFonts(): Promise<CardFont[]> {
  fonts ??= Promise.all(
    CARD_FONT_FILES.map(async ([name, file, weight]) => {
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

/** The response itself is used for both preview and export. */
export async function renderCard(req: Request, card: CardContent) {
  const [cardFontList, artwork] = await Promise.all([cardFonts(), cardWantsCover(req, card) ? coverData(card.cover) : null]);
  const { element, size } = cardLayout(req, card, artwork);
  return new ImageResponse(element, { ...size, fonts: cardFontList, headers: { "Cache-Control": "private, no-store" } });
}
