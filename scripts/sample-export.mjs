// A realistic Spotify Extended Streaming History for one invented listener, built
// from real artists and songs: `node scripts/sample-export.mjs <out-dir>`.
// Writes Streaming_History_Audio_<year>.json files in Spotify's export format.
// Deterministic (seeded), so screenshots and sample numbers stay stable.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Three listening eras, oldest first: [artist, album, [songs...]] per lead. */
const ERAS = [
  { from: "2023-12-01", leads: [
    ["Phoebe Bridgers", "Punisher", ["Motion Sickness", "Kyoto", "Garden Song", "I Know The End", "Savior Complex"]],
    ["boygenius", "the record", ["Not Strong Enough", "Cool About It", "$20", "True Blue"]],
    ["Mitski", "Be the Cowboy", ["Nobody", "Washing Machine Heart", "Geyser", "Me and My Husband"]],
  ] },
  { from: "2024-10-01", leads: [
    ["Sabrina Carpenter", "Short n' Sweet", ["Espresso", "Please Please Please", "Taste", "Bed Chem", "Juno"]],
    ["Chappell Roan", "The Rise and Fall of a Midwest Princess", ["Good Luck, Babe!", "HOT TO GO!", "Pink Pony Club", "Casual", "Red Wine Supernova"]],
    ["Billie Eilish", "HIT ME HARD AND SOFT", ["BIRDS OF A FEATHER", "LUNCH", "CHIHIRO", "WILDFLOWER"]],
  ] },
  { from: "2025-09-01", leads: [
    ["Stromae", "Multitude", ["L'enfer", "Santé", "Fils de joie", "La solassitude"]],
    ["Fred again..", "Actual Life 3 (January 1 - September 9 2022)", ["Delilah (pull me out of this)", "Turn On The Lights again..", "Danielle (smile on my face)", "adore u"]],
    ["Charlotte Adigéry & Bolis Pupul", "Topical Dancer", ["Thank You", "Blenda", "Haha", "Esperanto"]],
  ] },
];

/** Always in rotation, in every era. */
const STAPLES = [
  ["Arctic Monkeys", "AM", ["Do I Wanna Know?", "R U Mine?", "Why'd You Only Call Me When You're High?", "Arabella"]],
  ["Taylor Swift", "Midnights", ["Anti-Hero", "Lavender Haze", "Karma", "Maroon"]],
  ["Frank Ocean", "Blonde", ["Pink + White", "Ivy", "Nights", "Self Control"]],
  ["Daft Punk", "Random Access Memories", ["Get Lucky", "Instant Crush", "Lose Yourself to Dance"]],
  ["Tame Impala", "Currents", ["The Less I Know The Better", "Let It Happen", "Eventually"]],
  ["SZA", "SOS", ["Kill Bill", "Snooze", "Good Days", "Saturn"]],
  ["Radiohead", "In Rainbows", ["Weird Fishes/Arpeggi", "Nude", "Reckoner", "House of Cards"]],
  ["Kendrick Lamar", "GNX", ["luther", "tv off", "squabble up"]],
];

const DAY = 86_400_000;
const END = new Date("2026-11-15T00:00:00Z").getTime();

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const rnd = seeded(7);
const pick = (list) => list[Math.floor(rnd() * list.length)];
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Stable 22-character track id per song, shaped like Spotify's. */
function trackId(artist, song) {
  let h = 2166136261;
  for (const c of artist + "|" + song) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const r = seeded(h || 1);
  return Array.from({ length: 22 }, () => B62[Math.floor(r() * 62)]).join("");
}

/** Song length 2:30 to 4:40, fixed per song. */
const lengthMs = (id) => 150_000 + (id.charCodeAt(0) * 7919 + id.charCodeAt(1) * 104729) % 130_000;

/** Sessions per day: commute on weekdays, long evenings, slower weekends. */
function sessionsFor(date) {
  const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  const starts = weekend ? [11, 15, 21] : [7.75, 17.25, 20.5];
  // Summer and exam weeks run quieter; some days have no music at all.
  if (rnd() < 0.06) return [];
  return starts.filter(() => rnd() < 0.8).map((h) => ({ hour: h + rnd() * 1.2, tracks: 4 + Math.floor(rnd() * (weekend ? 18 : 12)) }));
}

const files = {};
for (let day = new Date(ERAS[0].from).getTime(); day < END; day += DAY) {
  const date = new Date(day);
  const iso = date.toISOString().slice(0, 10);
  const era = [...ERAS].reverse().find((e) => e.from <= iso);
  // A new obsession fades in: the first lead dominates, the others share.
  const weights = [0.32, 0.18, 0.12];
  for (const session of sessionsFor(date)) {
    let t = day + session.hour * 3_600_000;
    let shuffle = rnd() < 0.45;
    for (let i = 0; i < session.tracks; i++) {
      const r = rnd();
      const [artist, album, songs] = r < weights[0] ? era.leads[0] : r < weights[0] + weights[1] ? era.leads[1] : r < 0.62 ? era.leads[2] : pick(STAPLES);
      const song = pick(songs);
      const id = trackId(artist, song);
      const full = lengthMs(id);
      const skipped = rnd() < (shuffle ? 0.24 : 0.12);
      const ms = skipped ? 2_000 + Math.floor(rnd() * 28_000) : rnd() < 0.08 ? Math.floor(full * (0.4 + rnd() * 0.5)) : full;
      const year = new Date(t).getUTCFullYear();
      (files[year] ??= []).push({
        ts: new Date(t + ms).toISOString().replace(/\.\d{3}Z$/, "Z"),
        platform: rnd() < 0.7 ? "android" : "windows",
        ms_played: ms,
        conn_country: "BE",
        master_metadata_track_name: song,
        master_metadata_album_artist_name: artist,
        master_metadata_album_album_name: album,
        spotify_track_uri: `spotify:track:${id}`,
        episode_name: null,
        episode_show_name: null,
        spotify_episode_uri: null,
        audiobook_title: null,
        audiobook_uri: null,
        reason_start: i === 0 ? "clickrow" : "trackdone",
        reason_end: skipped ? "fwdbtn" : "trackdone",
        shuffle,
        skipped,
        offline: false,
        incognito_mode: false,
      });
      t += ms + 500;
      if (rnd() < 0.05) shuffle = !shuffle;
    }
  }
}

const out = process.argv[2] ?? "sample-export";
mkdirSync(out, { recursive: true });
let total = 0;
for (const [year, plays] of Object.entries(files)) {
  writeFileSync(path.join(out, `Streaming_History_Audio_${year}.json`), JSON.stringify(plays));
  total += plays.length;
}
console.log(`${total} plays in ${Object.keys(files).length} files -> ${out}`);
