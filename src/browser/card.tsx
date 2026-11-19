// Browser build only: stands in for `@/lib/card`. The same card layout, drawn
// by satori and turned into a PNG by resvg-wasm, both in the tab.
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { CARD_FONT_FILES, cardLayout, cardWantsCover, type CardContent, type CardFont } from "@/lib/card-layout";

export { cardFooter, eraTitleSize, type CardContent, type CardFont } from "@/lib/card-layout";

/** Copied into public/browser by scripts/browser.mjs. */
const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/browser`;

let ready: Promise<CardFont[]> | null = null;

/** Loads the resvg WASM and the card fonts once, on the first card. */
export function cardFonts(): Promise<CardFont[]> {
  ready ??= (async () => {
    await initWasm(fetch(`${ASSETS}/resvg.wasm`));
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

/** A cover as a data URI, or null when it can't be fetched (the card then goes without). */
export async function coverData(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
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

export async function renderCard(req: Request, card: CardContent) {
  const [fonts, artwork] = await Promise.all([cardFonts(), cardWantsCover(req, card) ? coverData(card.cover) : null]);
  const { element, size } = cardLayout(req, card, artwork);
  const svg = await satori(element, { ...size, fonts });
  const png = new Resvg(svg).render().asPng();
  return new Response(new Blob([png as BlobPart], { type: "image/png" }), { headers: { "content-type": "image/png" } });
}
