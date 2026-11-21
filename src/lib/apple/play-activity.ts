import type { PlayRow } from "@/lib/spotify/types";

/**
 * Apple Music's "Apple Music Play Activity.csv", from Apple's privacy export
 * (privacy.apple.com). The file has about 145 columns, many of them personal
 * (Apple ID, IP address, device). Only the columns below are ever read, and only
 * PlayRow fields leave this function. Pure: runs in the browser on the user's file.
 *
 * shortcut: column names come from community tools, not an Apple spec; check
 * them against a real export when one is available.
 */

const FILE = /(^|\/)Apple Music Play Activity\.csv$/i;
const COLUMNS = {
  song: "Song Name", artist: "Artist Name", start: "Event Start Timestamp", end: "Event End Timestamp",
  played: "Play Duration Milliseconds", type: "Event Type", reason: "End Reason Type",
} as const;

export function isAppleActivityFile(path: string): boolean {
  return FILE.test(path.replace(/\\/g, "/"));
}

/** RFC 4180 rows: quoted fields may hold commas, quotes ("") and line breaks. */
function* csvRows(text: string): Generator<string[]> {
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      yield row; row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); yield row; }
}

export function parseAppleActivity(text: string): PlayRow[] {
  const rows = csvRows(text);
  const header = rows.next().value;
  if (!header) return [];
  const at = (name: string) => header.indexOf(name);
  const col = Object.fromEntries(Object.entries(COLUMNS).map(([k, name]) => [k, at(name)])) as Record<keyof typeof COLUMNS, number>;
  if (col.song < 0 || col.played < 0 || (col.start < 0 && col.end < 0)) return [];

  const out: PlayRow[] = [];
  for (const r of rows) {
    const get = (i: number) => (i >= 0 ? r[i]?.trim() || null : null);
    // PLAY_START and other events repeat a play; the finished play carries its duration.
    if (col.type >= 0 && get(col.type) !== "PLAY_END") continue;
    const song = get(col.song);
    const ms = Number(get(col.played));
    if (!song || !Number.isFinite(ms) || ms <= 0) continue;
    const start = get(col.start) ? new Date(get(col.start)!) : get(col.end) ? new Date(new Date(get(col.end)!).getTime() - ms) : null;
    if (!start || Number.isNaN(start.getTime())) continue;
    const artist = get(col.artist);
    const reason = get(col.reason);
    out.push({
      playedAt: start, msPlayed: Math.round(ms), kind: "track",
      // Apple rows have no Spotify id; artist and title together identify the song.
      uri: `apple:${(artist ?? "").toLowerCase()}:${song.toLowerCase()}`,
      trackName: song, artistName: artist, albumName: null,
      reasonStart: null, reasonEnd: reason, skipped: reason ? reason.includes("SKIP") : null, shuffle: null, source: "export",
    });
  }
  return out;
}
