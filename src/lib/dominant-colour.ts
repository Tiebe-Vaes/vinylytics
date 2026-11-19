/** A cover image's dominant colour as RGB. Throws when the image can't be read.
 * The browser build swaps this module for src/browser/dominant-colour.ts. */
export async function dominantRgb(data: Buffer | Uint8Array): Promise<[number, number, number]> {
  const { default: sharp } = await import("sharp");
  const { dominant } = await sharp(data, { limitInputPixels: 16_777_216 }).stats();
  return [dominant.r, dominant.g, dominant.b];
}
