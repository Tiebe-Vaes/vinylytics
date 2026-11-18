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
