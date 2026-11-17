import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/spotify/item-meta", () => ({ itemMeta: async () => ({ title: "Artist", subtitle: "Artist", cover: null, spotifyUrl: null }) }));
vi.mock("@/lib/spotify/item-stats", () => ({ cachedItemStats: async () => ({
  minutes: 1, streams: 1, firstPlay: "2026-01-01T23:30:00Z", peakWeek: null, allTimeRank: 1, weekly: [], rankByMonth: [],
}) }));

afterEach(() => vi.unstubAllEnvs());

it("formats the first play in the configured timezone instead of the server timezone", async () => {
  vi.stubEnv("TZ", "UTC");
  vi.stubEnv("TIMEZONE", "Europe/Brussels");
  const { ItemPage } = await import("./item-page");
  const html = renderToStaticMarkup(await ItemPage({ refOf: { kind: "artist", name: "Artist" }, inkSeed: "Artist" }));
  expect(html).toContain("2 Jan 2026");
});
