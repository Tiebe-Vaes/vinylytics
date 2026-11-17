import { addDaysKey } from "@/lib/time";

/**
 * Pure stat helpers. Date math walks "YYYY-MM-DD" keys with addDaysKey, never
 * millisecond arithmetic, so DST days are just days.
 */

export function computeStreaks(dayKeys: string[], today: string): { current: number; longest: number } {
  const days = [...new Set(dayKeys)].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === addDaysKey(days[i - 1], 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // A streak still counts while today has no play yet.
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDaysKey(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDaysKey(cursor, -1);
  }
  return { current, longest };
}

/**
 * Bump-chart data: the top N artists of the whole range, and each one's rank
 * among those N in every month (null when they weren't played that month).
 */
export function rankByMonth(
  rows: { month: string; artist: string; minutes: number }[],
  topN = 10
): { months: string[]; artists: string[]; ranks: Record<string, (number | null)[]> } {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.artist, (totals.get(r.artist) ?? 0) + r.minutes);
  const byTotal = (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]);
  const artists = [...totals].sort(byTotal).slice(0, topN).map(([a]) => a);
  const keep = new Set(artists);
  const months = [...new Set(rows.map((r) => r.month))].sort();

  const ranks: Record<string, (number | null)[]> = Object.fromEntries(artists.map((a) => [a, months.map(() => null)]));
  months.forEach((month, i) => {
    rows
      .filter((r) => r.month === month && keep.has(r.artist) && r.minutes > 0)
      .map((r): [string, number] => [r.artist, r.minutes])
      .sort(byTotal)
      .forEach(([artist], rank) => (ranks[artist][i] = rank + 1));
  });
  return { months, artists, ranks };
}

/**
 * Minutes per genre. An artist with k tags gives minutes/k to each; untagged
 * artists count as "other". Top 10 genres, the rest folded into "other".
 */
export function genreMinutes(
  artists: { name: string; minutes: number }[],
  tags: Map<string, string[]>
): { genre: string; minutes: number }[] {
  const sums = new Map<string, number>();
  let other = 0;
  for (const a of artists) {
    const t = tags.get(a.name) ?? [];
    if (t.length === 0) other += a.minutes;
    for (const g of t) sums.set(g, (sums.get(g) ?? 0) + a.minutes / t.length);
  }
  const sorted = [...sums].sort((a, b) => b[1] - a[1]);
  for (const [, m] of sorted.slice(10)) other += m;
  const out = sorted.slice(0, 10).map(([genre, minutes]) => ({ genre, minutes }));
  if (other > 0) out.push({ genre: "other", minutes: other });
  return out;
}

export type Obsession = {
  uri: string;
  name: string;
  artist: string;
  start: string;
  end: string;
  streams: number;
  share: number;
};

const WINDOW_DAYS = 14;
const MIN_STREAMS = 15;
const MIN_SHARE = 0.4;

/**
 * Tracks you binged: the 14-day window holding the most of a track's streams,
 * kept when it has at least 15 streams and 40% of all the track's streams
 * ever. A steady favourite spreads out and never qualifies.
 */
export function findObsessions(
  rows: { uri: string; name: string; artist: string; day: string; streams: number }[],
  allTime: Map<string, number>
): Obsession[] {
  const byTrack = new Map<string, typeof rows>();
  for (const r of rows) byTrack.set(r.uri, [...(byTrack.get(r.uri) ?? []), r]);

  const out: Obsession[] = [];
  for (const [uri, days] of byTrack) {
    const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
    let best = { streams: 0, start: "", end: "" };
    let lo = 0;
    let sum = 0;
    for (let hi = 0; hi < sorted.length; hi++) {
      sum += sorted[hi].streams;
      const windowStart = addDaysKey(sorted[hi].day, -(WINDOW_DAYS - 1));
      while (sorted[lo].day < windowStart) sum -= sorted[lo++].streams;
      if (sum > best.streams) best = { streams: sum, start: sorted[lo].day, end: sorted[hi].day };
    }
    const total = allTime.get(uri) ?? best.streams;
    const share = total > 0 ? best.streams / total : 0;
    if (best.streams >= MIN_STREAMS && share >= MIN_SHARE) {
      out.push({ uri, name: sorted[0].name, artist: sorted[0].artist, start: best.start, end: best.end, streams: best.streams, share });
    }
  }
  return out.sort((a, b) => b.streams * b.share - a.streams * a.share).slice(0, 10);
}
