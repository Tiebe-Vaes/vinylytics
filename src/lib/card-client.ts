// Draws share cards in the browser: satori for the layout, resvg-wasm for the PNG.
// The browser build uses it for every card; the hosted build only for photo cards,
// so a photo never leaves the device. Assets come from /browser (scripts/card-assets.mjs).
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { CARD_FONT_FILES, type CardFont, type CardOptions, type CardPhoto } from "@/lib/card-layout";
import { specElement, type CardSpec } from "@/lib/card-spec";

const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/browser`;
let ready: Promise<CardFont[]> | null = null;

/** Loads the resvg WASM and the card fonts once, on the first card. */
export function clientCardFonts(): Promise<CardFont[]> {
  ready ??= (async () => {
    // resvg allows one init per page; a reloaded module (dev refresh) must not fail on the second.
    await initWasm(fetch(`${ASSETS}/resvg.wasm`)).catch((e: unknown) => { if (!String(e).includes("Already initialized")) throw e; });
    return Promise.all(CARD_FONT_FILES.map(async ([name, file, weight]) => {
      const res = await fetch(`${ASSETS}/${file.split("/").pop()}`);
      if (!res.ok) throw new Error(`Card font missing: ${file}`);
      return { name, weight, style: "normal" as const, data: await res.arrayBuffer() };
    }));
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

/** An image URL as a data URI, or null when it can't be fetched in 3 s (the card then goes without). */
export async function dataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function specPng(spec: CardSpec, artwork: string | null, options: CardOptions, photo?: CardPhoto | null): Promise<Blob> {
  const fonts = await clientCardFonts();
  const { element, size } = specElement(spec, artwork, options, photo);
  const svg = await satori(element, { ...size, fonts });
  const png = new Resvg(svg).render().asPng();
  return new Blob([png as BlobPart], { type: "image/png" });
}
