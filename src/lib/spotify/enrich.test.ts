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
  spotifyFetch: vi.fn(async (path: string) =>
    path.startsWith("/tracks/") ? trackFor(path.split("/")[2]) : { id: "ar1", name: "A", images: [] }
  ),
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

  it("leaves failed lookups (no name) alone instead of retrying them forever", async () => {
    await d.insert(schema.tracks).values({ uri: "spotify:track:gone", name: null });
    expect((await enrichMissing()).albums).toBe(0);
  });
});
