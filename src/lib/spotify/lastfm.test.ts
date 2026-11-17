import { afterEach, describe, expect, it, vi } from "vitest";
import { getTopTags, pickGenres } from "./lastfm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("pickGenres", () => {
  it("normalises, filters to genres and drops weak or non-genre tags", () => {
    expect(
      pickGenres([
        { name: "Hip Hop", count: 100 },
        { name: "seen live", count: 90 },
        { name: "rap", count: 60 },
        { name: "00s", count: 50 },
        { name: "hiphop", count: 40 },
        { name: "trap", count: 10 },
      ])
    ).toEqual(["hip-hop", "rap"]);
  });
  it("keeps at most the three strongest", () => {
    expect(
      pickGenres([
        { name: "rock", count: 30 },
        { name: "indie", count: 90 },
        { name: "pop", count: 50 },
        { name: "electronic", count: 70 },
      ])
    ).toEqual(["indie", "electronic", "pop"]);
  });
  it("handles no tags", () => {
    expect(pickGenres([])).toEqual([]);
  });
});

describe("getTopTags", () => {
  it("returns [] when Last.fm reports an error", async () => {
    vi.stubEnv("LASTFM_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: 6, message: "The artist you supplied could not be found" }))
    );
    expect(await getTopTags("Nobody")).toEqual([]);
  });
  it("returns [] without an API key", async () => {
    vi.stubEnv("LASTFM_API_KEY", "");
    expect(await getTopTags("Anyone")).toEqual([]);
  });
});
