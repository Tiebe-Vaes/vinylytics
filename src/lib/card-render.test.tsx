import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import sharp from "sharp";
import { cardOptions } from "@/lib/card-options";
import { specElement, type CardSpec } from "@/lib/card-spec";
import type { CardFont } from "@/lib/card-layout";

// The plain satori package (browser build, photo cards) sizes boxes as content-box unless told
// otherwise; without border-box the padded card overflowed and the footer fell off the bottom.
let fonts: CardFont[];
beforeAll(async () => {
  await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
  const font = (f: string) => readFileSync(`node_modules/@fontsource/${f}`).buffer as ArrayBuffer;
  fonts = [
    { name: "Big Shoulders", data: font("big-shoulders/files/big-shoulders-latin-900-normal.woff"), weight: 900, style: "normal" },
    { name: "Archivo", data: font("archivo/files/archivo-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Archivo", data: font("archivo/files/archivo-latin-600-normal.woff"), weight: 600, style: "normal" },
  ];
});

/** Light (text-coloured) pixels per row band. */
async function lightRows(spec: CardSpec, format: "post" | "story", photo: boolean) {
  const options = cardOptions(new URLSearchParams(`fields=lead,stat&format=${format}`), "recap", "cobalt", "dots");
  const bg = photo ? await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#ff0080" } }).jpeg().toBuffer() : null;
  const { element, size } = specElement(spec, null, options, bg && { src: `data:image/jpeg;base64,${bg.toString("base64")}` });
  const png = new Resvg(await satori(element, { ...size, fonts })).render().asPng();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const light = (y0: number, y1: number) => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] > 230 && data[i + 1] > 225 && data[i + 2] > 215) n++;
    }
    return n;
  };
  return { size, light };
}

const card: CardSpec = { type: "content", card: { kind: "recap", ink: "cobalt", edition: "x", title: "10,656 minutes", period: "2026", lead: "This year you listened for", stat: "That's 7 full days.", visual: "dots" } };

it.each([["post", false], ["post", true], ["story", true]] as const)("keeps the footer on a %s card (photo: %s)", async (format, photo) => {
  const { size, light } = await lightRows(card, format, photo);
  // The footer sits in the bottom padding band: above 64 px for posts, above the 340 px safe zone for stories.
  const bottom = format === "post" ? size.height - 64 : size.height - 340;
  expect(light(bottom - 80, bottom)).toBeGreaterThan(500);
  expect(light(bottom, size.height)).toBe(0);
}, 60_000);

it("draws a combo's tiles inside the card", async () => {
  const combo: CardSpec = { type: "combo", year: 2026, ink: "cobalt", tiles: [
    { id: "a", kicker: "A", headline: "One", ink: "cobalt" }, { id: "b", kicker: "B", headline: "Two", ink: "mustard" },
  ] };
  const { size, light } = await lightRows(combo, "post", false);
  expect(light(size.height - 144, size.height - 64)).toBeGreaterThan(500);
}, 60_000);
