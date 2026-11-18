import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { spotifyFetch } from "./client";

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
const pastAttempt = new Date("2020-01-01T00:00:00Z");

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
    await d.insert(schema.tracks).values({ uri: "spotify:track:old", name: "Old", artistName: "A", fetchedAt: pastAttempt });
    const n = await enrichMissing();
    expect(n.albums).toBe(1);
    const [t] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:old"));
    expect(t.albumId).toBe("al-old");
  });

  it("marks a failed album backfill so later runs reach the tracks behind it", async () => {
    await d.insert(schema.tracks).values([
      ...Array.from({ length: 3 }, (_, i) => ({ uri: `spotify:track:gone${i}`, name: `Gone ${i}`, fetchedAt: pastAttempt })),
      { uri: "spotify:track:good", name: "Good", fetchedAt: pastAttempt },
    ]);
    await enrichMissing(3); // only the 3 failing rows fit in this run
    const second = await enrichMissing(3);
    expect(second.albums).toBe(1);
    const [good] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:good"));
    expect(good.albumId).toBe("al-good");
  });

  it("gives recent failed lookups time to cool down", async () => {
    await d.insert(schema.tracks).values({ uri: "spotify:track:gone", name: null });
    expect((await enrichMissing()).albums).toBe(0);
  });

  it("recovers a cached failure and an artist that only now has a Spotify ID", async () => {
    const uri = "spotify:track:retry";
    await d.insert(schema.plays).values({ playedAt: new Date(), msPlayed: 100, kind: "track", uri, artistName: "A", source: "export" });
    await d.insert(schema.tracks).values({ uri, fetchedAt: pastAttempt });
    await d.insert(schema.artists).values({ name: "A", tags: ["pop"] });
    await d.insert(schema.albums).values({ id: "al-retry" });
    const art = [{ url: "https://i.scdn.co/image/retry", width: 600, height: 600 }];
    const track = trackFor("retry");
    vi.mocked(spotifyFetch)
      .mockResolvedValueOnce({ ...track, album: { ...track.album, images: art } })
      .mockResolvedValueOnce({ id: "ar1", images: art });
    await enrichMissing();
    expect((await d.select().from(schema.tracks))[0].imageUrl).toBe(art[0].url);
    expect((await d.select().from(schema.albums))[0].imageUrl).toBe(art[0].url);
    expect((await d.select().from(schema.artists))[0]).toMatchObject({ imageUrl: art[0].url, tags: ["pop"] });
  });

  it("stops a throttled run with partial counts and leaves the rest queued", async () => {
    await d.insert(schema.tracks).values(["a", "b", "c"].map((id) => ({ uri: `spotify:track:t${id}`, fetchedAt: pastAttempt })));
    vi.mocked(spotifyFetch)
      .mockResolvedValueOnce(trackFor("ta"))
      .mockRejectedValueOnce(new Error("Spotify /tracks failed: 429"));
    const calls = vi.mocked(spotifyFetch).mock.calls.length;
    expect(await enrichMissing()).toEqual({ tracks: 0, artists: 0, albums: 1 });
    expect(vi.mocked(spotifyFetch).mock.calls.length - calls).toBe(2);
    const untouched = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:tc"));
    expect(untouched[0].fetchedAt).toEqual(pastAttempt);
  });

  it("keeps valid art when a repair lookup returns none, and cools down art Spotify lacks", async () => {
    const kept = "https://i.scdn.co/image/kept";
    await d.insert(schema.albums).values({ id: "al-kept" });
    await d.insert(schema.tracks).values({ uri: "spotify:track:kept", imageUrl: kept, albumId: "al-kept", fetchedAt: pastAttempt });
    await enrichMissing();
    const [t] = await d.select().from(schema.tracks).where(eq(schema.tracks.uri, "spotify:track:kept"));
    expect(t.imageUrl).toBe(kept);
    expect(t.fetchedAt.getTime()).toBeGreaterThan(pastAttempt.getTime());
    const calls = vi.mocked(spotifyFetch).mock.calls.length;
    await enrichMissing();
    expect(vi.mocked(spotifyFetch).mock.calls.length).toBe(calls);
  });
});
