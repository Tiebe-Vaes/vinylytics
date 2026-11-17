import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { resetDb, useTestDb } from "@/db/test-db";
import { itemMeta } from "./item-meta";

let d: Awaited<ReturnType<typeof useTestDb>>;

describe("itemMeta", () => {
  beforeAll(async () => {
    d = await useTestDb();
  });
  beforeEach(async () => {
    await resetDb();
    await d.insert(schema.plays).values([
      { playedAt: new Date("2026-03-01T10:00:00Z"), msPlayed: 60_000, kind: "track", uri: "spotify:track:t1", trackName: "Undertow", artistName: "Low Orbit Club", albumName: "Orbit", source: "export" },
      { playedAt: new Date("2026-03-01T11:00:00Z"), msPlayed: 60_000, kind: "track", uri: "spotify:track:t2", trackName: "Glass", artistName: "Plays Only", source: "export" },
    ]);
    await d.insert(schema.tracks).values({ uri: "spotify:track:t1", name: "Undertow", artistName: "Low Orbit Club", imageUrl: "https://i/t1", albumId: "al1" });
    await d.insert(schema.albums).values({ id: "al1", name: "Orbit", artistName: "Low Orbit Club", imageUrl: "https://i/al1" });
    await d.insert(schema.artists).values({ name: "Low Orbit Club", spotifyId: "ar1", imageUrl: "https://i/ar1" });
  });

  it("describes an artist from the artists cache", async () => {
    expect(await itemMeta({ kind: "artist", name: "Low Orbit Club" })).toEqual({
      title: "Low Orbit Club", subtitle: "Artist", cover: "https://i/ar1", spotifyUrl: "https://open.spotify.com/artist/ar1",
    });
  });

  it("describes an artist known only from plays", async () => {
    expect(await itemMeta({ kind: "artist", name: "Plays Only" })).toMatchObject({ title: "Plays Only", cover: null, spotifyUrl: null });
  });

  it("describes a track with its artist, cover and link", async () => {
    expect(await itemMeta({ kind: "track", uri: "spotify:track:t1" })).toEqual({
      title: "Undertow", subtitle: "Low Orbit Club", cover: "https://i/t1", spotifyUrl: "https://open.spotify.com/track/t1",
    });
  });

  it("describes a track known only from plays", async () => {
    expect(await itemMeta({ kind: "track", uri: "spotify:track:t2" })).toMatchObject({ title: "Glass", subtitle: "Plays Only" });
  });

  it("describes an album", async () => {
    expect(await itemMeta({ kind: "album", albumId: "al1" })).toEqual({
      title: "Orbit", subtitle: "Low Orbit Club", cover: "https://i/al1", spotifyUrl: "https://open.spotify.com/album/al1",
    });
  });

  it("returns null for anything unknown", async () => {
    expect(await itemMeta({ kind: "artist", name: "Nobody" })).toBeNull();
    expect(await itemMeta({ kind: "track", uri: "spotify:track:nope" })).toBeNull();
    expect(await itemMeta({ kind: "album", albumId: "nope" })).toBeNull();
  });
});
