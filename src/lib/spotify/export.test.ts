import { describe, expect, it } from "vitest";
import { isExportAudioFile, parseExportFile } from "./export";

describe("isExportAudioFile", () => {
  it("accepts audio history at any depth and the old endsong name", () => {
    expect(isExportAudioFile("Spotify Extended Streaming History/Streaming_History_Audio_2019-2021_0.json")).toBe(true);
    expect(isExportAudioFile("endsong_3.json")).toBe(true);
  });
  it("rejects video history, the readme and the short account export", () => {
    expect(isExportAudioFile("Spotify Extended Streaming History/Streaming_History_Video_2020-2024.json")).toBe(false);
    expect(isExportAudioFile("ReadMeFirst_ExtendedStreamingHistory.pdf")).toBe(false);
    expect(isExportAudioFile("StreamingHistory_music_0.json")).toBe(false);
  });
});

const base = {
  platform: "android",
  conn_country: "BE",
  ip_addr: "203.0.113.7",
  master_metadata_track_name: null,
  master_metadata_album_artist_name: null,
  master_metadata_album_album_name: null,
  spotify_track_uri: null,
  episode_name: null,
  episode_show_name: null,
  spotify_episode_uri: null,
  audiobook_title: null,
  audiobook_uri: null,
  audiobook_chapter_uri: null,
  audiobook_chapter_title: null,
  reason_start: "trackdone",
  reason_end: "trackdone",
  shuffle: false,
  skipped: false,
  offline: false,
  offline_timestamp: null,
  incognito_mode: false,
};

const fixture = [
  { ...base, ts: "2024-03-01T08:00:00Z", ms_played: 200000, master_metadata_track_name: "Song", master_metadata_album_artist_name: "Band", master_metadata_album_album_name: "LP", spotify_track_uri: "spotify:track:t1", skipped: true, reason_end: "fwdbtn" },
  { ...base, ts: "2024-03-01T09:00:00Z", ms_played: 1800000, episode_name: "Ep 4", episode_show_name: "The Show", spotify_episode_uri: "spotify:episode:e1" },
  { ...base, ts: "2024-03-01T10:00:00Z", ms_played: 120000, master_metadata_track_name: "Local", master_metadata_album_artist_name: "Me" },
  { ...base, ts: "2024-03-01T11:00:00Z", ms_played: 900000, audiobook_title: "A Book", audiobook_uri: "spotify:show:b1" },
];

describe("parseExportFile", () => {
  const rows = parseExportFile(fixture);

  it("classifies tracks, episodes, local files and audiobooks", () => {
    expect(rows.map((r) => r.kind)).toEqual(["track", "episode", "track", "audiobook"]);
    expect(rows[0]).toMatchObject({
      playedAt: new Date("2024-03-01T08:00:00Z"),
      msPlayed: 200000,
      uri: "spotify:track:t1",
      trackName: "Song",
      artistName: "Band",
      albumName: "LP",
      skipped: true,
      reasonEnd: "fwdbtn",
      source: "export",
    });
  });
  it("uses the show name as the artist of an episode", () => {
    expect(rows[1]).toMatchObject({ trackName: "Ep 4", artistName: "The Show", uri: "spotify:episode:e1" });
  });
  it("keeps a local file with a null uri", () => {
    expect(rows[2].uri).toBeNull();
  });
  it("never copies privacy fields", () => {
    for (const r of rows) {
      for (const k of ["ip_addr", "conn_country", "platform", "incognito_mode", "offline", "offline_timestamp"]) {
        expect(r).not.toHaveProperty(k);
      }
    }
  });
  it("drops rows without a valid ts and tolerates junk input", () => {
    expect(parseExportFile([{ ...fixture[0], ts: undefined }])).toEqual([]);
    expect(parseExportFile([{ ...fixture[0], ts: "nope" }])).toEqual([]);
    expect(parseExportFile({})).toEqual([]);
  });
});
