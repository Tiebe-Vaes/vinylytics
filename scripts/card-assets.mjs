// Copies the resvg WASM and the card fonts to public/browser, where the in-browser
// card renderer (src/lib/card-client.ts) fetches them. Runs after npm install and
// before the browser build; public/browser is git-ignored.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/browser", { recursive: true });
copyFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm", "public/browser/resvg.wasm");
for (const font of ["big-shoulders/files/big-shoulders-latin-900-normal.woff", "archivo/files/archivo-latin-400-normal.woff", "archivo/files/archivo-latin-600-normal.woff"]) {
  copyFileSync(`node_modules/@fontsource/${font}`, `public/browser/${font.split("/").pop()}`);
}
