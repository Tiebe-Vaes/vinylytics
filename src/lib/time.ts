import { timezone } from "./tz";

/**
 * All timestamps are stored UTC. Every day-bucketing decision happens here,
 * in the user's zone, so DST never shifts a night's sleep onto the wrong date.
 */
/** The configured TIMEZONE; read per call so tests and env changes apply. */
export const tz = timezone;

/** "2026-08-06" for the given instant, in TZ. */
export function localDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "Thursday 6 August" — header line. */
export function longDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz(),
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** The hour (0–23) for the given instant, in TZ. Used for day/night glyphs. */
export function localHour(d: Date = new Date()): number {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz(),
      hour: "2-digit",
      hour12: false,
    }).format(d)
  );
  // Some ICU builds report midnight as "24" rather than "00" under hour12:false.
  return h === 24 ? 0 : h;
}

/** Minutes since local midnight (0–1439) for the given instant, in TZ. */
export function localMinutes(d: Date = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .split(":")
    .map(Number);
  return (h === 24 ? 0 : h) * 60 + m;
}

/** Offset of TZ from UTC at the given instant, in ms (+1h in winter). */
function tzOffsetMs(d: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return wall - Math.floor(d.getTime() / 60_000) * 60_000;
}

/** A local wall-clock time (month 1–12) as the matching UTC instant. */
export function brusselsToUtc(y: number, m: number, d: number, h = 0, min = 0): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - tzOffsetMs(new Date(guess));
  // Near a DST switch the offset at the guess can differ from the answer's.
  return new Date(guess - tzOffsetMs(new Date(first)));
}

/** "08:45" in TZ. */
export function clock(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Minutes -> "7h 12m" / "48m". */
export function humanDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Compact relative time for "next up": "in 25m", "in 3h", "now". */
export function until(target: Date, now: Date = new Date()): string {
  const mins = Math.round((target.getTime() - now.getTime()) / 60000);
  if (mins <= 0 && mins > -60) return "now";
  if (mins < 0) return "passed";
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

/** Monday-start week key, e.g. "2026-08-03". */
export function weekStartKey(d: Date = new Date()): string {
  const key = localDateKey(d);
  const [y, m, day] = key.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, day, 12));
  const dow = (utcNoon.getUTCDay() + 6) % 7; // Mon = 0
  utcNoon.setUTCDate(utcNoon.getUTCDate() - dow);
  return utcNoon.toISOString().slice(0, 10);
}

/** Shift a "YYYY-MM-DD" key by n days. */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
