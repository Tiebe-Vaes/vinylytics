import { addDaysKey } from "@/lib/time";

/**
 * Eras: your history cut into phases by who you listened to most. Pure, so the
 * rules are tested here; eras-data.ts feeds it weekly minutes from the db.
 */

export const MIN_ERA_WEEKS = 3;
export const QUIET_WEEK_MINUTES = 30;
export const SILENCE_SPLIT_WEEKS = 4;

export type WeekArtist = { week: string; artist: string; minutes: number }; // week = Monday "YYYY-MM-DD"
export type EraOverride =
  | { id: string; kind: "rename"; anchor: string; name: string } // anchor = a day "YYYY-MM-DD"
  | { id: string; kind: "merge"; from: string; to: string }; // inclusive days
export type Era = {
  id: string;
  start: string;
  end: string;
  weeks: number;
  lead: string;
  artists: { name: string; minutes: number }[];
  minutes: number;
  name: string;
  renamedBy: string | null;
};

type Week = { week: string; active: boolean; label: string | null; byArtist: Map<string, number>; forced: boolean };
type Run = { label: string; weeks: Week[] };

function topArtist(byArtist: Map<string, number>): string | null {
  let best: string | null = null;
  let bestMin = -1;
  for (const [artist, min] of byArtist) {
    if (min > bestMin || (min === bestMin && best !== null && artist < best)) {
      best = artist;
      bestMin = min;
    }
  }
  return best;
}

function sumArtists(weeks: Week[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of weeks) for (const [a, m] of w.byArtist) out.set(a, (out.get(a) ?? 0) + m);
  return out;
}

const runMinutes = (r: Run) => r.weeks.reduce((s, w) => s + [...w.byArtist.values()].reduce((a, b) => a + b, 0), 0);

function group(weeks: Week[]): Run[] {
  const runs: Run[] = [];
  for (const w of weeks) {
    const last = runs.at(-1);
    if (last && last.label === w.label) last.weeks.push(w);
    else runs.push({ label: w.label!, weeks: [w] });
  }
  return runs;
}

/** Folds runs shorter than MIN_ERA_WEEKS into their heavier neighbour until none are left. */
function smooth(segment: Week[]): Run[] {
  let runs = group(segment);
  for (;;) {
    let i = -1;
    for (let k = 0; k < runs.length; k++) {
      if (runs[k].weeks.length < MIN_ERA_WEEKS && (i === -1 || runs[k].weeks.length < runs[i].weeks.length)) i = k;
    }
    if (i === -1 || runs.length === 1) return runs;

    const left = runs[i - 1];
    const right = runs[i + 1];
    const into = !right || (left && runMinutes(left) >= runMinutes(right)) ? i - 1 : i + 1;
    const [a, b] = into < i ? [into, i] : [i, into];
    const merged = [...runs[a].weeks, ...runs[b].weeks];
    const label = topArtist(sumArtists(merged))!;
    for (const w of merged) w.label = label;
    runs = group(runs.flatMap((r) => r.weeks));
  }
}

const overlaps = (week: string, from: string, to: string) => week <= to && addDaysKey(week, 6) >= from;

export function detectEras(rows: WeekArtist[], overrides: EraOverride[]): { eras: Era[]; unusedOverrideIds: string[] } {
  const byWeek = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = byWeek.get(r.week) ?? new Map<string, number>();
    m.set(r.artist, (m.get(r.artist) ?? 0) + r.minutes);
    byWeek.set(r.week, m);
  }
  const keys = [...byWeek.keys()].sort();
  const unused = new Set(overrides.map((o) => o.id));

  // Full timeline from the first to the last week; weeks without plays are quiet.
  const timeline: Week[] = [];
  if (keys.length) {
    for (let w = keys[0]; w <= keys.at(-1)!; w = addDaysKey(w, 7)) {
      const byArtist = byWeek.get(w) ?? new Map<string, number>();
      const total = [...byArtist.values()].reduce((a, b) => a + b, 0);
      const active = total >= QUIET_WEEK_MINUTES;
      timeline.push({ week: w, active, label: active ? topArtist(byArtist) : null, byArtist: active ? byArtist : new Map(), forced: false });
    }
  }
  // Trim quiet edges so an era never starts or ends on a quiet week.
  while (timeline.length && !timeline[0].active) timeline.shift();
  while (timeline.length && !timeline.at(-1)!.active) timeline.pop();

  // Merge overrides: every week in range takes the range's top artist and is never split.
  for (const o of overrides) {
    if (o.kind !== "merge") continue;
    const inRange = timeline.filter((w) => overlaps(w.week, o.from, o.to));
    if (!inRange.some((w) => w.active)) continue;
    unused.delete(o.id);
    const label = topArtist(sumArtists(inRange));
    for (const w of inRange) {
      w.label = label;
      w.forced = true;
    }
  }

  // Split at long silences; shorter quiet runs take the label before them.
  const segments: Week[][] = [];
  let current: Week[] = [];
  let quiet: Week[] = [];
  for (const w of timeline) {
    if (w.active || w.forced) {
      if (quiet.length >= SILENCE_SPLIT_WEEKS) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        for (const q of quiet) q.label = current.at(-1)?.label ?? w.label;
        current.push(...quiet);
      }
      quiet = [];
      current.push(w);
    } else {
      quiet.push(w);
    }
  }
  if (current.length) segments.push(current);

  const eras: Era[] = segments.flatMap((seg) =>
    smooth(seg).map((run) => {
      const active = run.weeks.filter((w) => w.active);
      const totals = [...sumArtists(run.weeks)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const lead = totals[0][0];
      const lastActive = active.at(-1) ?? run.weeks.at(-1)!;
      return {
        id: run.weeks[0].week,
        start: run.weeks[0].week,
        end: addDaysKey(lastActive.week, 6),
        weeks: active.length,
        lead,
        artists: totals.slice(0, 3).map(([name, minutes]) => ({ name, minutes })),
        minutes: totals.reduce((s, [, m]) => s + m, 0),
        name: `${lead} era`,
        renamedBy: null,
      };
    })
  );

  for (const o of overrides) {
    if (o.kind !== "rename") continue;
    const era = eras.find((e) => e.start <= o.anchor && o.anchor <= e.end);
    if (!era) continue;
    era.name = o.name;
    era.renamedBy = o.id;
    unused.delete(o.id);
  }

  return { eras, unusedOverrideIds: [...unused] };
}
