// Seed plays for `npm run dev:local`: ~18 months of fake listening with three
// phases, each led by a different artist, so era detection has something to find.
// Deterministic: same seed, same plays, stable screenshots.

const ARTISTS = ["The Paper Coast", "Mira Vale", "Low Orbit Club", "Saint Juniper", "Hollow Pines", "Neon Atlas", "Ada Wren", "Cold Harbour", "Velvet Static", "Juno & the Tides"];
const TRACKS = ["Northern Lights Drive", "Glass Houses", "Last Train Home", "Paper Planes Again", "Slow Motion Summer", "Undertow", "Satellite Heart", "Golden Hour Static", "Antwerp at 3AM", "Small Rooms"];
const ALBUMS = ["Tidelines", "Small Hours", "Orbit", "Juniper", "Pines", "Atlas", "Wren", "Harbour", "Static", "Tides"];
/** Leading artist per 180-day phase, newest first. */
const PHASE_LEADS = [3, 2, 1];
const DAYS = 540;
const DAY = 86_400_000;

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * @param {Date} now
 * @returns {Array<{ playedAt: Date; msPlayed: number; kind: string; uri: string; trackName: string; artistName: string; albumName: string; reasonStart: string; reasonEnd: string; skipped: boolean; shuffle: boolean; source: string }>} plays, oldest first
 */
export function seedRows(now) {
  const rnd = seeded(42);
  const rows = [];
  for (let age = DAYS - 1; age >= 0; age--) {
    const lead = PHASE_LEADS[Math.min(Math.floor(age / 180), 2)];
    const plays = 6 + Math.floor(rnd() * 11);
    // Evening-weighted session start, then back-to-back tracks.
    let t = now.getTime() - age * DAY - (now.getTime() % DAY) + (8 + Math.floor(rnd() * 14)) * 3_600_000;
    for (let i = 0; i < plays; i++) {
      const a = rnd() < 0.5 ? lead : Math.floor(rnd() * ARTISTS.length);
      const k = Math.floor(rnd() * 3);
      const skipped = rnd() < 0.1;
      const full = 150_000 + Math.floor(rnd() * 90_000);
      const msPlayed = skipped ? 5_000 + Math.floor(rnd() * 20_000) : full;
      if (t > now.getTime()) break;
      rows.push({
        playedAt: new Date(t),
        msPlayed,
        kind: "track",
        uri: `spotify:track:seed${a}x${k}`,
        trackName: TRACKS[(a + k) % TRACKS.length],
        artistName: ARTISTS[a],
        albumName: ALBUMS[a],
        reasonStart: "trackdone",
        reasonEnd: skipped ? "fwdbtn" : "trackdone",
        skipped,
        shuffle: rnd() < 0.3,
        source: "export",
      });
      t += msPlayed + 1_000;
    }
  }
  return rows;
}

/**
 * Albums and tracks behind the seeded plays, so album charts, album pages and
 * album completion have data. No artwork: the demo stays offline.
 */
export function seedCatalog() {
  const albums = ARTISTS.map((artist, a) => ({
    id: `seed-album-${a}`, name: ALBUMS[a], artistName: artist, totalTracks: 12, releaseDate: String(1995 + ((a * 7) % 31)),
  }));
  const tracks = ARTISTS.flatMap((artist, a) => [0, 1, 2].map((k) => ({
    uri: `spotify:track:seed${a}x${k}`, name: TRACKS[(a + k) % TRACKS.length], artistName: artist,
    albumName: ALBUMS[a], albumId: `seed-album-${a}`, durationMs: 210_000,
  })));
  return { tracks, albums };
}

/** Inserts the seed when `plays` is empty. */
export async function seedPlays(db, schema, now = new Date()) {
  const existing = await db.select({ id: schema.plays.id }).from(schema.plays).limit(1);
  if (existing.length) return 0;
  const { tracks, albums } = seedCatalog();
  await db.insert(schema.albums).values(albums).onConflictDoNothing();
  await db.insert(schema.tracks).values(tracks).onConflictDoNothing();
  const rows = seedRows(now);
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(schema.plays).values(rows.slice(i, i + 1000)).onConflictDoNothing();
  }
  return rows.length;
}
