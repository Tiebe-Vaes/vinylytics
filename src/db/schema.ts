import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * The owner's Spotify tokens: one row, `id = 'owner'`. `spotifyUserId` is the
 * account that claimed this copy; sign-in refuses every other account.
 * `broken` is set when Spotify rejects a refresh.
 */
export const auth = pgTable("auth", {
  id: text("id").primaryKey().default("owner"),
  spotifyUserId: text("spotify_user_id").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: text("scope"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  broken: boolean("broken").notNull().default(false),
});

/**
 * Every play, from the extended-history export or the recently-played poller.
 * The unique (played_at, uri) key makes re-imports and repeated syncs no-ops;
 * NULLS NOT DISTINCT so plays without a uri (local files) de-duplicate too.
 * Export privacy fields (IP, country, platform, incognito) are never stored.
 */
export const plays = pgTable(
  "plays",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
    msPlayed: integer("ms_played").notNull(),
    /** track | episode | audiobook */
    kind: text("kind").notNull(),
    /** Null for local files. */
    uri: text("uri"),
    trackName: text("track_name"),
    /** Artist, or the show name for episodes. */
    artistName: text("artist_name"),
    albumName: text("album_name"),
    reasonStart: text("reason_start"),
    reasonEnd: text("reason_end"),
    /** Export only; null for API rows, which carry no skip data. */
    skipped: boolean("skipped"),
    shuffle: boolean("shuffle"),
    /** export | api */
    source: text("source").notNull(),
  },
  (t) => [
    unique("plays_at_uri_key").on(t.playedAt, t.uri).nullsNotDistinct(),
    index("plays_at_idx").on(t.playedAt),
    index("plays_artist_idx").on(t.artistName),
    index("plays_uri_idx").on(t.uri),
  ]
);

/** Enrichment cache, filled lazily for tracks that show up in stats. */
export const tracks = pgTable("tracks", {
  uri: text("uri").primaryKey(),
  name: text("name"),
  artistName: text("artist_name"),
  albumName: text("album_name"),
  imageUrl: text("image_url"),
  durationMs: integer("duration_ms"),
  /** First artist's Spotify id, used to look the artist up. */
  artistId: text("artist_id"),
  /** Spotify album id; null until enriched (or backfilled for older rows). */
  albumId: text("album_id"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("tracks_album_idx").on(t.albumId)]);

/** Albums seen on enriched tracks: cover and track count for album completion. */
export const albums = pgTable("albums", {
  /** Spotify album id. */
  id: text("id").primaryKey(),
  name: text("name"),
  artistName: text("artist_name"),
  imageUrl: text("image_url"),
  totalTracks: integer("total_tracks"),
  releaseDate: text("release_date"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Keyed by name: the export carries artist names, not ids. A row with no
 * image and no tags still marks the artist as looked up, so it isn't retried.
 */
export const artists = pgTable("artists", {
  name: text("name").primaryKey(),
  spotifyId: text("spotify_id"),
  imageUrl: text("image_url"),
  /** Last.fm genre tags, filtered to the allow-list. */
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per sync or import. Chunks of one import share an id and accumulate. */
export const syncRuns = pgTable("sync_runs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** api | export */
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  rowsSeen: integer("rows_seen").notNull().default(0),
  rowsWritten: integer("rows_written").notNull().default(0),
  ok: boolean("ok").notNull().default(false),
  error: text("error"),
});

/**
 * Your edits to the detected eras. Eras themselves are derived on read; these
 * rows are re-applied every time (see lib/spotify/eras.ts).
 * rename: `anchor` day + `name`. merge: `fromDay`..`toDay`, inclusive.
 */
export const eraOverrides = pgTable("era_overrides", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** rename | merge */
  kind: text("kind").notNull(),
  anchor: text("anchor"),
  name: text("name"),
  fromDay: text("from_day"),
  toDay: text("to_day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
