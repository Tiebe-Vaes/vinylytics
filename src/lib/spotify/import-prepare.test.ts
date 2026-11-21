import { expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { prepareImport } from "./import-prepare";
import type { PlayWire } from "./types";

const raw = (i: number) => ({
  ts: new Date(Date.UTC(2024, 0, 1, 0, i)).toISOString(), ms_played: 120_000, master_metadata_track_name: `Synthetic ${i}`,
  master_metadata_album_artist_name: "Test artist", master_metadata_album_album_name: "Test album",
  spotify_track_uri: `spotify:track:synthetic${i}`, reason_start: "trackdone", reason_end: "trackdone",
  skipped: false, shuffle: false, ip_addr: "192.0.2.1", conn_country: "ZZ", platform: "synthetic",
});
const json = (n: number, from = 0) => strToU8(JSON.stringify(Array.from({ length: n }, (_, i) => raw(from + i))));

async function run(files: File[]) {
  const staged: [number, PlayWire[]][] = [];
  const total = await prepareImport(files, async (offset, rows) => { staged.push([offset, rows]); }, () => {});
  return { total, staged };
}

it("streams audio history out of a ZIP in 1000-play batches without private fields", async () => {
  const zip = zipSync({
    "Spotify Extended Streaming History/Streaming_History_Audio_2024_0.json": json(1500),
    "Spotify Extended Streaming History/Streaming_History_Audio_2024_1.json": json(10, 2000),
    "Spotify Extended Streaming History/Streaming_History_Video_2024.json": json(5),
    "ReadMeFirst.pdf": strToU8("not history"),
  });
  const { total, staged } = await run([new File([zip], "my_spotify_data.zip")]);
  expect(total).toBe(1510);
  expect(staged.map(([offset, rows]) => [offset, rows.length])).toEqual([[0, 1000], [1000, 500], [1500, 10]]);
  const text = JSON.stringify(staged);
  expect(text).not.toMatch(/ip_addr|192\.0\.2\.1|conn_country|platform/);
  expect(staged[0][1][0].playedAt).toBe("2024-01-01T00:00:00.000Z");
});

it("rejects malformed and unrelated archives with a clear message", async () => {
  const broken = zipSync({ "Streaming_History_Audio_2024.json": strToU8("[{\"ts\": ") });
  await expect(run([new File([broken], "export.zip")])).rejects.toThrow(/invalid JSON/);
  const other = zipSync({ "Userdata.json": strToU8("{}") });
  await expect(run([new File([other], "export.zip")])).rejects.toThrow(/Extended Streaming History/);
  await expect(run([new File([strToU8("garbage")], "export.zip")])).rejects.toThrow(/Extended Streaming History/);
  await expect(run([new File([strToU8("{}")], "Streaming_History_Audio_2024.json")])).rejects.toThrow(/no valid plays/);
});

it("imports Apple Music's play activity, inside Apple's ZIP or as the CSV itself", async () => {
  const { readFileSync } = await import("node:fs");
  const csv = readFileSync("src/lib/apple/play-activity.sample.csv");
  const zip = zipSync({ "Apple_Media_Services/Apple Music Activity/Apple Music Play Activity.csv": new Uint8Array(csv), "Apple_Media_Services/Read Me First.pdf": strToU8("x") });
  const fromZip = await run([new File([zip], "Apple Media Services information.zip")]);
  const fromCsv = await run([new File([csv], "Apple Music Play Activity.csv")]);
  expect(fromZip.total).toBe(3);
  expect(fromCsv.staged).toEqual(fromZip.staged);
  expect(fromCsv.staged[0][1][0]).toMatchObject({ trackName: "Slow Motion Summer", artistName: "Saint Juniper", playedAt: "2026-05-01T10:00:00.000Z" });
});
