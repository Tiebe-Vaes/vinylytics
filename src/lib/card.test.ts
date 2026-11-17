import { afterEach, describe, expect, it, vi } from "vitest";
import { cardFonts, coverData, eraTitleSize } from "./card";

describe("eraTitleSize", () => {
  it("keeps short names huge and shrinks long ones so they fit above the tracklist", () => {
    expect(eraTitleSize("Mira Vale era", false)).toBe(120);
    const long = eraTitleSize("The extraordinarily long winter where I only listened to Low Orbit Club on repea", false);
    expect(long.toString()).toBe("56");
  });

  it("gives the story format more room", () => {
    expect(eraTitleSize("Mira Vale era", true)).toBeGreaterThan(eraTitleSize("Mira Vale era", false));
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("coverData", () => {
  it("returns null when the cover 404s", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 404 })));
    expect(await coverData("https://i.scdn.co/image/gone")).toBeNull();
  });

  it("returns null when the cover times out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("timeout", "TimeoutError"); }));
    expect(await coverData("https://i.scdn.co/image/slow")).toBeNull();
  });

  it("returns null for no url", async () => {
    expect(await coverData(null)).toBeNull();
  });

  it("returns a data URI for a good image", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "content-type": "image/jpeg" } })));
    expect(await coverData("https://i.scdn.co/image/ok")).toBe("data:image/jpeg;base64,/9j/");
  });
});

describe("cardFonts", () => {
  it("loads the display and UI faces from the font packages", async () => {
    const fonts = await cardFonts();
    expect(fonts.map((f) => `${f.name}-${f.weight}`)).toEqual(["Big Shoulders-900", "Archivo-400", "Archivo-600"]);
    for (const f of fonts) expect(f.data.byteLength).toBeGreaterThan(1000);
  });
});
