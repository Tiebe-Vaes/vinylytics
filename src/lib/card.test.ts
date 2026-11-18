import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
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
  it("refuses non-Spotify hosts, insecure URLs and credentials without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of ["http://i.scdn.co/image/x", "https://127.0.0.1/x", "https://i.scdn.co.evil.test/x", "https://user:pass@i.scdn.co/image/x", "https://i.scdn.co:8443/image/x"]) {
      expect(await coverData(url)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an oversized streamed image even without a content length", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1))));
    expect(await coverData("https://i.scdn.co/image/large")).toBeNull();
  });

  it("refuses non-image responses and never follows redirects", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await coverData("https://i.scdn.co/image/html")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("https://i.scdn.co/image/html", expect.objectContaining({ redirect: "error" }));
  });

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
    const jpeg = await sharp({ create: { width: 80, height: 120, channels: 3, background: "#ff00ff" } }).jpeg().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(jpeg), { headers: { "content-type": "image/jpeg" } })));
    const uri = await coverData("https://i.scdn.co/image/ok");
    expect(uri).toMatch(/^data:image\/png;base64,/);
    expect(await sharp(Buffer.from(uri!.split(",")[1], "base64")).metadata()).toMatchObject({ width: 80, height: 120 });
  });

  it("leaves out a damaged cover even when the CDN reports success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "content-type": "image/jpeg" } })));
    expect(await coverData("https://i.scdn.co/image/broken")).toBeNull();
  });
});

describe("cardFonts", () => {
  it("loads the display and UI faces from the font packages", async () => {
    const fonts = await cardFonts();
    expect(fonts.map((f) => `${f.name}-${f.weight}`)).toEqual(["Big Shoulders-900", "Archivo-400", "Archivo-600"]);
    for (const f of fonts) expect(f.data.byteLength).toBeGreaterThan(1000);
  });
});
