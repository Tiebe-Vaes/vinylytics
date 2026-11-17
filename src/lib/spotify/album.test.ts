import { describe, expect, it } from "vitest";
import { albumFromTrack } from "./album";
import type { SpotifyTrack } from "./types";

const track: SpotifyTrack = {
  type: "track",
  name: "Undertow",
  duration_ms: 200_000,
  uri: "spotify:track:t1",
  external_urls: {},
  artists: [{ name: "Low Orbit Club", id: "ar1" }],
  album: {
    id: "al1",
    name: "Orbit",
    total_tracks: 11,
    release_date: "2024-03-01",
    images: [
      { url: "small", width: 64, height: 64 },
      { url: "big", width: 640, height: 640 },
    ],
    artists: [{ name: "Low Orbit Club", id: "ar1" }],
  },
};

describe("albumFromTrack", () => {
  it("maps the album on a track to an albums row", () => {
    expect(albumFromTrack(track)).toEqual({
      id: "al1",
      name: "Orbit",
      artistName: "Low Orbit Club",
      imageUrl: "big",
      totalTracks: 11,
      releaseDate: "2024-03-01",
    });
  });
});
