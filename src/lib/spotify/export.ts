import type { PlayRow } from "./types";

/**
 * Spotify's Extended Streaming History export. Pure: runs in the browser on
 * the user's files, and only the fields in PlayRow ever leave it.
 */

const AUDIO = /^Streaming_History_Audio_.*\.json$/;
const ENDSONG = /^endsong_\d+\.json$/;

export function isExportAudioFile(path: string): boolean {
  const base = path.split(/[\/]/).pop() ?? "";
  return AUDIO.test(base) || ENDSONG.test(base);
}

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

function toRow(r: Raw): PlayRow | null {
  const ts = typeof r.ts === "string" ? new Date(r.ts) : null;
  if (!ts || Number.isNaN(ts.getTime())) return null;
  if (typeof r.ms_played !== "number" || r.ms_played < 0) return null;

  const episode = str(r.spotify_episode_uri);
  const audiobook = str(r.audiobook_uri);
  return {
    playedAt: ts,
    msPlayed: Math.round(r.ms_played),
    kind: episode ? "episode" : audiobook ? "audiobook" : "track",
    uri: str(r.spotify_track_uri) ?? episode ?? audiobook,
    trackName: str(r.master_metadata_track_name) ?? str(r.episode_name) ?? str(r.audiobook_title),
    artistName: str(r.master_metadata_album_artist_name) ?? str(r.episode_show_name) ?? str(r.audiobook_title),
    albumName: str(r.master_metadata_album_album_name),
    reasonStart: str(r.reason_start),
    reasonEnd: str(r.reason_end),
    skipped: bool(r.skipped),
    shuffle: bool(r.shuffle),
    source: "export",
  };
}

export function parseExportFile(json: unknown): PlayRow[] {
  if (!Array.isArray(json)) return [];
  const rows: PlayRow[] = [];
  for (const r of json) {
    if (r && typeof r === "object") {
      const row = toRow(r as Raw);
      if (row) rows.push(row);
    }
  }
  return rows;
}
