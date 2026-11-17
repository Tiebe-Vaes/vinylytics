import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { PlayRow } from "./types";

/**
 * One-off copy of the owner's history out of Tieboard's database. Reads
 * spotify_plays, spotify_tracks and spotify_artists only; never spotify_auth,
 * and never writes to the source. Conflict keys make re-runs add nothing.
 */

/** Runs a read-only query on the source database and returns its rows. */
export type SourceQuery = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

type Dest = PgDatabase<PgQueryResultHKT, typeof schema>;

export type TieboardPlay = {
  id: string;
  played_at: Date | string;
  ms_played: number;
  kind: string;
  uri: string | null;
  track_name: string | null;
  artist_name: string | null;
  album_name: string | null;
  reason_start: string | null;
  reason_end: string | null;
  skipped: boolean | null;
  shuffle: boolean | null;
  source: string;
};

export function mapTieboardPlay(r: TieboardPlay): PlayRow {
  return {
    playedAt: new Date(r.played_at),
    msPlayed: r.ms_played,
    kind: r.kind as PlayRow["kind"],
    uri: r.uri,
    trackName: r.track_name,
    artistName: r.artist_name,
    albumName: r.album_name,
    reasonStart: r.reason_start,
    reasonEnd: r.reason_end,
    skipped: r.skipped,
    shuffle: r.shuffle,
    source: r.source as PlayRow["source"],
  };
}

const PAGE = 5000;
const INSERT = 1000;

async function pages(read: SourceQuery, table: string, order: string, each: (rows: Record<string, unknown>[]) => Promise<void>) {
  for (let offset = 0; ; offset += PAGE) {
    const rows = await read(`SELECT * FROM ${table} ORDER BY ${order} LIMIT $1 OFFSET $2`, [PAGE, offset]);
    if (rows.length === 0) return;
    for (let i = 0; i < rows.length; i += INSERT) await each(rows.slice(i, i + INSERT));
    if (rows.length < PAGE) return;
  }
}

export async function copyAll(read: SourceQuery, dest: Dest): Promise<{ plays: number; tracks: number; artists: number }> {
  const n = { plays: 0, tracks: 0, artists: 0 };

  await pages(read, "spotify_plays", "played_at, id", async (rows) => {
    const values = rows.map((r) => mapTieboardPlay(r as TieboardPlay));
    const inserted = await dest.insert(schema.plays).values(values).onConflictDoNothing().returning({ id: schema.plays.id });
    n.plays += inserted.length;
  });

  await pages(read, "spotify_tracks", "uri", async (rows) => {
    const values = rows.map((r) => ({
      uri: r.uri as string,
      name: r.name as string | null,
      artistName: r.artist_name as string | null,
      albumName: r.album_name as string | null,
      imageUrl: r.image_url as string | null,
      durationMs: r.duration_ms as number | null,
      artistId: r.artist_id as string | null,
      fetchedAt: new Date(r.fetched_at as string | Date),
    }));
    const inserted = await dest.insert(schema.tracks).values(values).onConflictDoNothing().returning({ uri: schema.tracks.uri });
    n.tracks += inserted.length;
  });

  await pages(read, "spotify_artists", "name", async (rows) => {
    const values = rows.map((r) => ({
      name: r.name as string,
      spotifyId: r.spotify_id as string | null,
      imageUrl: r.image_url as string | null,
      tags: (r.tags as string[] | null) ?? [],
      fetchedAt: new Date(r.fetched_at as string | Date),
    }));
    const inserted = await dest.insert(schema.artists).values(values).onConflictDoNothing().returning({ name: schema.artists.name });
    n.artists += inserted.length;
  });

  return n;
}
