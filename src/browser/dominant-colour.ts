// Browser build only: stands in for `@/lib/dominant-colour` (sharp is native,
// server-only). era-covers.ts catches this and uses the lead artist's ink instead.
export async function dominantRgb(): Promise<[number, number, number]> {
  throw new Error("Cover colours are not read in the browser build");
}
