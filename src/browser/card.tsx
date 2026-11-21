// Browser build only: stands in for `@/lib/card`. The same card layout, drawn
// by satori and turned into a PNG by resvg-wasm, both in the tab.
import { cardWantsCover, type CardContent } from "@/lib/card-layout";
import { specOptions, withDemo, type CardSpec } from "@/lib/card-spec";
import { demoAllowed } from "@/lib/env";
import { clientCardFonts, dataUri, specPng } from "@/lib/card-client";

export { cardFooter, eraTitleSize, type CardContent, type CardFont } from "@/lib/card-layout";
export { clientCardFonts as cardFonts, dataUri as coverData };

/** `?as=json` answers with the card's data, for drawing it with a photo in the composer. */
export async function renderSpec(req: Request, input: CardSpec) {
  const spec = withDemo(input, demoAllowed());
  const q = new URL(req.url).searchParams;
  if (q.get("as") === "json") return Response.json(spec);
  const artwork = spec.type === "content" && cardWantsCover(req, spec.card) ? await dataUri(spec.card.cover) : null;
  const png = await specPng(spec, artwork, specOptions(q, spec));
  return new Response(png, { headers: { "content-type": "image/png" } });
}

export function renderCard(req: Request, card: CardContent) {
  return renderSpec(req, { type: "content", card });
}
