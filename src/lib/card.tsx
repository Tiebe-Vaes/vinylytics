import { readFile } from "node:fs/promises";
import path from "node:path";
import { demoAllowed } from "@/lib/env";
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

/**
 * Font size for an era name on a card. Names run up to 80 characters and
 * Satori doesn't shrink-to-fit, so step the size down by length.
 */
export function eraTitleSize(name: string, story: boolean): number {
  const n = name.length;
  const base = n <= 16 ? 120 : n <= 28 ? 96 : n <= 44 ? 72 : 56;
  return story ? Math.round(base * 1.25) : base;
}

export const CARD_SIZES ={ post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } } as const;
export type CardFormat = keyof typeof CARD_SIZES;
export const cardFormat = (v: string | null): CardFormat => (v === "story" ? "story" : "post");

/** The shared sleeve frame of every card: ink field, wordmark, attribution, optional cover sticker. */
export function CardFrame({
  ink,
  period,
  catalogue,
  cover,
  children,
}: {
  ink: string;
  /** When this covers, printed in the credits at the foot like a sleeve's small print. */
  period: string;
  /** A sleeve's catalogue line, e.g. "VNL 2605 · SIDE A". */
  catalogue: string;
  cover: string | null;
  children: React.ReactNode;
}) {
  const fg = inkText(ink);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: ink, color: fg, padding: 80, fontFamily: "Archivo" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontFamily: "Big Shoulders", fontWeight: 900, fontSize: 44, letterSpacing: -0.5 }}>VINYLYTICS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 26, fontWeight: 600 }}>
          <span style={{ fontFamily: "Big Shoulders", fontWeight: 900, fontSize: 34 }}>{catalogue}</span>
          <span>{period}</span>
          <span>{demoAllowed() ? "Demo data, synthetic history" : "Data from Spotify"}</span>
        </div>
        {cover ? (
          // Unaltered cover, framed like a sticker: Spotify's guidelines allow no crop or filter.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} width={160} height={160} style={{ border: `4px solid ${fg}`, objectFit: "contain", background: "#0F0F10" }} alt="" />
        ) : null}
      </div>
    </div>
  );
}
