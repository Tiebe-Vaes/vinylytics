import { readFile } from "node:fs/promises";
import path from "node:path";
import { inkText } from "@/lib/ink";

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
  );
  return fonts;
}

/** A cover as a data URI for the card, or null when it can't be fetched within 3 s (the card then goes without). */
export async function coverData(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export const CARD_SIZES = { post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } } as const;
export type CardFormat = keyof typeof CARD_SIZES;
export const cardFormat = (v: string | null): CardFormat => (v === "story" ? "story" : "post");

/** The shared sleeve frame of every card: ink field, wordmark, attribution, optional cover sticker. */
export function CardFrame({
  ink,
  topLeft,
  cover,
  children,
}: {
  ink: string;
  topLeft: string;
  cover: string | null;
  children: React.ReactNode;
}) {
  const fg = inkText(ink);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: ink, color: fg, padding: 80, fontFamily: "Archivo" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 600 }}>
        <span>{topLeft}</span>
        <span style={{ fontFamily: "Big Shoulders", fontWeight: 900, fontSize: 44, letterSpacing: -0.5 }}>VINYLYTICS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 26, fontWeight: 600 }}>Data from Spotify</span>
        {cover ? (
          // Unaltered cover, framed like a sticker: Spotify's guidelines allow no crop or filter.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={160} height={160} style={{ border: `4px solid ${fg}`, objectFit: "contain", background: "#0F0F10" }} alt="" />
        ) : null}
      </div>
    </div>
  );
}
