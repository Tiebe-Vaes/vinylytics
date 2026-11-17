import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { copyAll, mapTieboardPlay, type SourceQuery } from "@/lib/spotify/copy";

const TIEBOARD_TABLES = `
CREATE TABLE spotify_plays (
  id text PRIMARY KEY, played_at timestamptz NOT NULL, ms_played integer NOT NULL, kind text NOT NULL,
  uri text, track_name text, artist_name text, album_name text, reason_start text, reason_end text,
  skipped boolean, shuffle boolean, source text NOT NULL);
CREATE TABLE spotify_tracks (uri text PRIMARY KEY, name text, artist_name text, album_name text,
  image_url text, duration_ms integer, artist_id text, fetched_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE spotify_artists (name text PRIMARY KEY, spotify_id text, image_url text,
  tags jsonb NOT NULL DEFAULT '[]', fetched_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE spotify_auth (id text PRIMARY KEY, refresh_token text NOT NULL);
INSERT INTO spotify_auth VALUES ('owner', 'secret-token');
INSERT INTO spotify_plays VALUES
  ('p1', '2024-01-01T10:00:00Z', 200000, 'track', 'spotify:track:a', 'A', 'Artist', 'Album', 'trackdone', 'trackdone', false, false, 'export'),
  ('p2', '2024-01-01T10:04:00Z', 180000, 'track', 'spotify:track:b', 'B', 'Artist', 'Album', null, null, null, null, 'api'),
  ('p3', '2024-01-02T09:00:00Z', 1000, 'episode', null, null, 'Show', null, null, null, true, null, 'export');
INSERT INTO spotify_tracks (uri, name, artist_name) VALUES ('spotify:track:a', 'A', 'Artist');
INSERT INTO spotify_artists (name, tags) VALUES ('Artist', '["indie"]');
`;

async function destination() {
  const client = new PGlite();
  const dir = path.resolve(__dirname, "../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.exec(stmt);
    }
  }
  return { client, db: drizzle(client, { schema }) };
}

describe("mapTieboardPlay", () => {
  it("keeps every column, including an api source", () => {
    const at = new Date("2024-01-01T10:04:00Z");
    expect(
      mapTieboardPlay({
        id: "p2", played_at: at, ms_played: 180000, kind: "track", uri: "spotify:track:b", track_name: "B",
        artist_name: "Artist", album_name: "Album", reason_start: null, reason_end: null, skipped: null,
        shuffle: null, source: "api",
      })
    ).toEqual({
      playedAt: at, msPlayed: 180000, kind: "track", uri: "spotify:track:b", trackName: "B", artistName: "Artist",
      albumName: "Album", reasonStart: null, reasonEnd: null, skipped: null, shuffle: null, source: "api",
    });
  });
});

describe("copyAll", () => {
  let read: SourceQuery;
  let dest: Awaited<ReturnType<typeof destination>>;

  beforeEach(async () => {
    const src = new PGlite();
    await src.exec(TIEBOARD_TABLES);
    read = async (text, params) => (await src.query<Record<string, unknown>>(text, params)).rows;
    dest = await destination();
  });

  it("copies plays, tracks and artists", async () => {
    expect(await copyAll(read, dest.db)).toEqual({ plays: 3, tracks: 1, artists: 1 });
    const plays = await dest.db.select().from(schema.plays);
    expect(plays.map((p) => p.source).sort()).toEqual(["api", "export", "export"]);
    expect((await dest.db.select().from(schema.artists))[0].tags).toEqual(["indie"]);
  });

  it("is idempotent: a second run adds nothing", async () => {
    await copyAll(read, dest.db);
    expect(await copyAll(read, dest.db)).toEqual({ plays: 0, tracks: 0, artists: 0 });
    expect(await dest.db.select().from(schema.plays)).toHaveLength(3);
  });

  it("never copies tokens", async () => {
    await copyAll(read, dest.db);
    expect(await dest.db.select().from(schema.auth)).toHaveLength(0);
  });
});
