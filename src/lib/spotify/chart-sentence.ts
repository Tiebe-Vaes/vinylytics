import type { ChartKind } from "./charts";

const NOUN: Record<ChartKind, string> = { artist: "artists", track: "songs", album: "albums" };
const PERIOD: Record<string, string> = { "4w": "of the last 4 weeks", "6m": "of the last 6 months", "1y": "of the last year", all: "of all time" };

const day = (key: string, withYear: boolean) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });

/** The chart as one readable line; also the share card's caption. */
export function chartSentence(f: { kind: ChartKind; range: string; sort: "time" | "plays"; from?: string; to?: string }): string {
  const period = f.range === "custom" && f.from && f.to
    ? `from ${day(f.from, f.from.slice(0, 4) !== f.to.slice(0, 4))} to ${day(f.to, true)}`
    : PERIOD[f.range] ?? PERIOD["4w"];
  return `Top ${NOUN[f.kind]} ${period} by ${f.sort === "plays" ? "plays" : "minutes"}`;
}
