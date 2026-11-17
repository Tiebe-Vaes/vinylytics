import { describe, expect, it } from "vitest";
import { toNowPlaying } from "./now-playing";
import type { CurrentlyPlayingResponse } from "./types";

const track: CurrentlyPlayingResponse = {
  is_playing: true,
  progress_ms: 61_000,
  currently_playing_type: "track",
  item: {
    type: "track",
    name: "Midnight City",
    duration_ms: 243_000,
    uri: "spotify:track:abc",
    external_urls: { spotify: "https://open.spotify.com/track/abc" },
    artists: [{ name: "M83", id: "a1" }, { name: "Guest", id: "a2" }],
    album: {
      name: "Hurry Up, We're Dreaming",
      images: [
        { url: "small.jpg", width: 64, height: 64 },
        { url: "big.jpg", width: 640, height: 640 },
        { url: "mid.jpg", width: 300, height: 300 },
      ],
    },
  },
};

describe("toNowPlaying", () => {
  it("returns null when nothing is playing (204)", () => {
    expect(toNowPlaying(null)).toBeNull();
  });

  it("returns null for an ad", () => {
    expect(
      toNowPlaying({ is_playing: true, progress_ms: 0, currently_playing_type: "ad", item: null })
    ).toBeNull();
  });

  it("maps a track", () => {
    expect(toNowPlaying(track)).toEqual({
      kind: "track",
      title: "Midnight City",
      subtitle: "M83, Guest",
      imageUrl: "big.jpg",
      url: "https://open.spotify.com/track/abc",
      progressMs: 61_000,
      durationMs: 243_000,
      isPlaying: true,
    });
  });

  it("maps a podcast episode to its show", () => {
    const np = toNowPlaying({
      is_playing: false,
      progress_ms: 10,
      currently_playing_type: "episode",
      item: {
        type: "episode",
        name: "Ep 1",
        duration_ms: 3_600_000,
        uri: "spotify:episode:e1",
        external_urls: { spotify: "https://open.spotify.com/episode/e1" },
        images: [{ url: "ep.jpg", width: 640, height: 640 }],
        show: { name: "The Show" },
      },
    });
    expect(np).toMatchObject({ kind: "episode", title: "Ep 1", subtitle: "The Show", imageUrl: "ep.jpg", isPlaying: false });
  });

  it("gives a null image when the album has none", () => {
    const np = toNowPlaying({
      ...track,
      item: { ...track.item!, album: { name: "x", images: [] } } as CurrentlyPlayingResponse["item"],
    });
    expect(np?.imageUrl).toBeNull();
  });
});
