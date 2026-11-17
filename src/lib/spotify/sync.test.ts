import { describe, expect, it } from "vitest";
import { dropNearDuplicates, recentToPlays, syncStatus } from "./sync";
import { SpotifyAuthBroken, SpotifyNotConnected } from "./auth";
import type { PlayRow, RecentlyPlayedItem } from "./types";

const item: RecentlyPlayedItem = {
  played_at: "2026-10-17T10:00:00.000Z",
  track: {
    type: "track",
    name: "Song",
    duration_ms: 200_000,
    uri: "spotify:track:t1",
    external_urls: {},
    artists: [{ name: "First", id: "a1" }, { name: "Second", id: "a2" }],
    album: { name: "Album", images: [] },
  },
};

const row = (uri: string | null, iso: string): PlayRow => ({
  playedAt: new Date(iso),
  msPlayed: 1,
  kind: "track",
  uri,
  trackName: null,
  artistName: null,
  albumName: null,
  reasonStart: null,
  reasonEnd: null,
  skipped: null,
  shuffle: null,
  source: "api",
});

describe("recentToPlays", () => {
  it("maps a recently-played item to an api play", () => {
    const [p] = recentToPlays([item]);
    expect(p.playedAt).toEqual(new Date(item.played_at));
    expect(p.msPlayed).toBe(200_000);
    expect(p.skipped).toBeNull();
    expect(p.source).toBe("api");
    expect(p.kind).toBe("track");
    expect(p.artistName).toBe("First");
    expect(p.uri).toBe("spotify:track:t1");
  });
});

describe("dropNearDuplicates", () => {
  const existing = [{ uri: "spotify:track:t1", playedAt: new Date("2026-10-17T10:00:00Z") }];

  it("drops a candidate within 60 s of the same track", () => {
    expect(dropNearDuplicates([row("spotify:track:t1", "2026-10-17T10:00:45Z")], existing)).toEqual([]);
  });
  it("keeps one 90 s away", () => {
    expect(dropNearDuplicates([row("spotify:track:t1", "2026-10-17T10:01:30Z")], existing)).toHaveLength(1);
  });
  it("keeps a different track at the same time", () => {
    expect(dropNearDuplicates([row("spotify:track:t2", "2026-10-17T10:00:00Z")], existing)).toHaveLength(1);
  });
  it("never drops a null uri by the window rule", () => {
    const nullExisting = [{ uri: null, playedAt: new Date("2026-10-17T10:00:00Z") }];
    expect(dropNearDuplicates([row(null, "2026-10-17T10:00:10Z")], nullExisting)).toHaveLength(1);
  });
});

describe("syncStatus", () => {
  it("treats a never-connected account as a skip", () => {
    expect(syncStatus(new SpotifyNotConnected())).toEqual({ http: 200, body: { skipped: "not connected" } });
  });
  it("fails visibly when the connection is broken", () => {
    expect(syncStatus(new SpotifyAuthBroken())).toEqual({ http: 503, body: { error: "reconnect needed" } });
  });
  it("rethrows anything else", () => {
    expect(() => syncStatus(new Error("x"))).toThrow("x");
  });
});
