import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { isAppleActivityFile, parseAppleActivity } from "./play-activity";

// A hand-made file in the shape community tools report for Apple's privacy export;
// the real export has about 145 columns, most of them personal data we never read.
const sample = readFileSync("src/lib/apple/play-activity.sample.csv", "utf8");

it("recognises the play activity file, inside the Apple export or on its own", () => {
  expect(isAppleActivityFile("Apple_Media_Services/Apple Music Activity/Apple Music Play Activity.csv")).toBe(true);
  expect(isAppleActivityFile("Apple Music Play Activity.csv")).toBe(true);
  expect(isAppleActivityFile("Apple Music - Play History Daily Tracks.csv")).toBe(false);
});

it("keeps finished plays with a song and a time, and reads only the columns it needs", () => {
  const rows = parseAppleActivity(sample);
  expect(rows).toEqual([
    { playedAt: new Date("2026-05-01T10:00:00.000Z"), msPlayed: 240000, kind: "track", uri: "apple:saint juniper:slow motion summer",
      trackName: "Slow Motion Summer", artistName: "Saint Juniper", albumName: null, reasonStart: null, reasonEnd: "NATURAL_END_OF_TRACK", skipped: false, shuffle: null, source: "export" },
    { playedAt: new Date("2026-05-01T10:05:00.000Z"), msPlayed: 20000, kind: "track", uri: "apple:juno & the tides:northern lights, drive",
      trackName: "Northern Lights, Drive", artistName: "Juno & the Tides", albumName: null, reasonStart: null, reasonEnd: "TRACK_SKIPPED_FORWARDS", skipped: true, shuffle: null, source: "export" },
    // No start time: the end time minus what was played. No artist: kept, with none.
    { playedAt: new Date("2026-05-02T21:00:00.000Z"), msPlayed: 180000, kind: "track", uri: "apple::quiet \"room\"",
      trackName: "Quiet \"Room\"", artistName: null, albumName: null, reasonStart: null, reasonEnd: "NATURAL_END_OF_TRACK", skipped: false, shuffle: null, source: "export" },
  ]);
  expect(JSON.stringify(rows)).not.toMatch(/Client IP|Device Identifier|Apple ID/);
});

it("returns nothing for a file without the play columns", () => {
  expect(parseAppleActivity("Track Description,Date Played\nA - B,20260501\n")).toEqual([]);
  expect(parseAppleActivity("")).toEqual([]);
});
