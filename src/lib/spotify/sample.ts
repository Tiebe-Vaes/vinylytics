import { hasDb } from "@/db";
import { demoAllowed } from "@/lib/env";
import type { ChartData, MusicData } from "./data";
import { rankByMonth } from "./stats";
import type { NowPlaying } from "./types";

/* Demo-mode data for screenshots. Invented titles: no real listening data. */

/**
 * Sample music only when there is no database at all (dev-demo screenshots).
 * dev:local has a local DB, so it shows what was actually imported there.
 */
export function musicSampleMode(): boolean {
  return demoAllowed() && !hasDb();
}

export const sampleNowPlaying: NowPlaying = {
  kind: "track",
  title: "Northern Lights Drive",
  subtitle: "The Paper Coast",
  imageUrl: null,
  url: null,
  progressMs: 94_000,
  durationMs: 231_000,
  isPlaying: true,
};

/* A deterministic two-year listening history, shaped like a real one. */
const months = Array.from({ length: 22 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 0 + i, 1));
  const minutes = Math.round(1800 + 900 * Math.sin(i / 2.3) + (i % 5) * 140);
  return { month: d.toISOString().slice(0, 7), minutes };
});

export const sampleMusicData: MusicData = {
  totals: { minutes: months.reduce((a, m) => a + m.minutes, 0), streams: 14_212, tracks: 3_906, artists: 1_148 },
  byMonth: months,
  byYear: [
    { year: 2025, minutes: months.slice(0, 12).reduce((a, m) => a + m.minutes, 0) },
    { year: 2026, minutes: months.slice(12).reduce((a, m) => a + m.minutes, 0) },
  ],
  streaks: { current: 23, longest: 61 },
  mostActiveWeekday: { weekday: 4, avgMinutes: 94 },
  biggestDay: { date: "2026-03-14", minutes: 412 },
  todayMinutes: 47,
  top: { artists: { "4w": [], "6m": [], all: [] }, tracks: { "4w": [], "6m": [], all: [] } },
};

const ARTISTS = ["The Paper Coast", "Mira Vale", "Low Orbit Club", "Saint Juniper", "Hollow Pines", "Neon Atlas", "Ada Wren", "Cold Harbour", "Velvet Static", "Juno & the Tides"];
const TRACKS = ["Northern Lights Drive", "Glass Houses", "Last Train Home", "Paper Planes Again", "Slow Motion Summer", "Undertow", "Satellite Heart", "Golden Hour Static", "Antwerp at 3AM", "Small Rooms"];

const sampleList = (names: string[], subtitle: (i: number) => string, shift: number) =>
  names.map((_, i) => {
    const name = names[(i + shift) % names.length];
    return { name, subtitle: subtitle((i + shift) % names.length), imageUrl: null, url: null, minutes: 2400 - i * 190, streams: 610 - i * 47 };
  });

sampleMusicData.top = {
  artists: {
    "4w": sampleList(ARTISTS, () => "", 2),
    "6m": sampleList(ARTISTS, () => "", 1),
    all: sampleList(ARTISTS, () => "", 0),
  },
  tracks: {
    "4w": sampleList(TRACKS, (i) => ARTISTS[i], 3),
    "6m": sampleList(TRACKS, (i) => ARTISTS[i], 1),
    all: sampleList(TRACKS, (i) => ARTISTS[i], 0),
  },
};

/* Deterministic pseudo-random so screenshots never change between renders. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function sampleChartData(year: number): ChartData {
  const rnd = seeded(42);
  const hourWeekday = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const commute = (hour === 8 || hour === 17) && weekday < 5 ? 40 : 0;
      const evening = hour >= 19 && hour <= 23 ? 25 : 0;
      const night = hour < 7 ? 0 : 6;
      hourWeekday.push({ weekday, hour, minutes: Math.round((commute + evening + night) * (0.6 + rnd())) });
    }
  }
  const days = [];
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year && d < new Date(); d.setUTCDate(d.getUTCDate() + 1)) {
    const v = rnd();
    if (v > 0.12) days.push({ date: d.toISOString().slice(0, 10), value: Math.round(20 + v * 160) });
  }
  const months = Array.from({ length: 10 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const bumpRows = months.flatMap((month, i) =>
    ARTISTS.slice(0, 8).map((artist, j) => ({ month, artist, minutes: Math.round(300 + 200 * Math.sin(i / 2 + j) + 40 * (8 - j)) }))
  );
  return {
    hourWeekday,
    calendar: { year, days },
    bump: rankByMonth(bumpRows, 8),
    genres: [
      { genre: "indie", minutes: 9_100 },
      { genre: "electronic", minutes: 6_400 },
      { genre: "alternative", minutes: 5_200 },
      { genre: "pop", minutes: 3_900 },
      { genre: "hip-hop", minutes: 2_300 },
      { genre: "folk", minutes: 1_600 },
      { genre: "other", minutes: 2_100 },
    ],
    obsessions: [
      { uri: "s1", name: "Antwerp at 3AM", artist: "Velvet Static", start: `${year}-03-02`, end: `${year}-03-15`, streams: 64, share: 0.82 },
      { uri: "s2", name: "Undertow", artist: "Hollow Pines", start: `${year}-06-10`, end: `${year}-06-23`, streams: 41, share: 0.66 },
      { uri: "s3", name: "Small Rooms", artist: "Juno & the Tides", start: `${year}-09-01`, end: `${year}-09-14`, streams: 27, share: 0.51 },
    ],
    discovery: months.map((month, i) => ({
      month,
      count: 6 + Math.round(10 * rnd()) + (i % 3 === 0 ? 8 : 0),
      names: ARTISTS.slice(i % 5, (i % 5) + 3),
    })),
    skips: {
      tracks: TRACKS.slice(0, 5).map((name, i) => ({ name, subtitle: ARTISTS[i], plays: 40 - i * 5, skipRate: 0.71 - i * 0.08 })),
      artists: ARTISTS.slice(3, 8).map((name, i) => ({ name, subtitle: "", plays: 120 - i * 14, skipRate: 0.52 - i * 0.06 })),
    },
    kinds: [
      { kind: "track", minutes: 21_400 },
      { kind: "episode", minutes: 3_900 },
      { kind: "audiobook", minutes: 600 },
    ],
  };
}
