import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";

const trackFor = (id: string) => ({
  type: "track", name: `T${id}`, duration_ms: 1, uri: `spotify:track:${id}`, external_urls: {},
  artists: [{ name: "A", id: "ar1" }],
  album: { id: `al-${id}`, name: `Album ${id}`, total_tracks: 9, release_date: "2024", images: [], artists: [{ name: "A", id: "ar1" }] },
});

vi.mock("./client", () => ({
  spotifyFetch: vi.fn(async (path: string) => {
    if (!path.startsWith("/tracks/")) return { id: "ar1", name: "A", images: [] };
    const id = path.split("/")[2];
    if (id.startsWith("gone")) throw new Error("Spotify /tracks failed: 404");
    return trackFor(id);
  }),
}));
vi.mock("./lastfm", () => ({ getTopTags: vi.fn(async () => []), pickGenres: () => [] }));

const { enrichMissing } = await import("./enrich");

describe("enrichMissing", () => {
  let d: Awaited<ReturnType<typeof useTestDb>>;
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(resetDb);

  it("stores the album with a newly enriched track", async () => {
    await d.insert(schema.plays).values({
      playedAt: new Date(), msPlayed: 60_000, kind: "track", uri: "spotify:track:x1", artistName: "A", source: "api",
    });
    await enrichMissing();
    const [t] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:x1"));
    expect(t.albumId).toBe("al-x1");
    const [a] = await d.select().from(schema.albums).where(eq(schema.albums.id, "al-x1"));
    expect(a.totalTracks).toBe(9);
  });

  it("backfills the album for tracks enriched before albums existed", async () => {
    await d.insert(schema.tracks).values({ uri: "spotify:track:old", name: "Old", artistName: "A" });
    const n = await enrichMissing();
    expect(n.albums).toBe(1);
    const [t] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:old"));
    expect(t.albumId).toBe("al-old");
  });

  it("marks a failed album backfill so later runs reach the tracks behind it", async () => {
    await d.insert(schema.tracks).values([
      ...Array.from({ length: 3 }, (_, i) => ({ uri: `spotify:track:gone${i}`, name: `Gone ${i}` })),
      { uri: "spotify:track:good", name: "Good" },
    ]);
    await enrichMissing(3); // only the 3 failing rows fit in this run
    const second = await enrichMissing(3);
    expect(second.albums).toBe(1);
    const [good] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:good"));
    expect(good.albumId).toBe("al-good");
  });

  it("leaves failed lookups (no name) alone instead of retrying them forever", async () => {
    await d.insert(schema.tracks).values({ uri: "spotify:track:gone", name: null });
    expect((await enrichMissing()).albums).toBe(0);
  });
});
