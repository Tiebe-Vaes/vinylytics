import { addDaysKey, localDateKey, localToUtc } from "@/lib/time";
import { CHART_RANGES } from "./data";
import type { ChartKind, ChartSort } from "./charts";
import type { Range } from "./types";

function validDay(day: string, today: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= "1900-01-01" && day <= today && addDaysKey(day, 0) === day;
}

export function parseChartFilters(params: URLSearchParams, now = new Date()) {
  const type = params.get("kind");
  const kind: ChartKind = type === "album" || type === "track" ? type : "artist";
  const sort: ChartSort = params.get("sort") === "plays" ? "plays" : "time";
  const today = localDateKey(now);
  const preset = CHART_RANGES.find(({value}) => value === params.get("range")) ?? CHART_RANGES[0];
  const range = params.get("range") === "custom" ? "custom" : preset.value;
  const custom = range === "custom";
  const from = custom ? (params.get("from") ?? addDaysKey(today, -27)) : addDaysKey(today, 1 - (preset.days ?? 1));
  const to = custom ? (params.get("to") ?? today) : today;
  const valid = !custom || (validDay(from, today) && validDay(to, today) && from <= to);
  const midnight = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return localToUtc(year, month, day);
  };
  const window: Range = valid && range !== "all" ? {from: midnight(from), to: midnight(addDaysKey(to, 1))} : null;
  return {kind, sort, range, from, to, window, valid};
}

/** Keep known, single-valued page filters. Repeated fields are ignored. */
export function pageQuery(params: Record<string, string | string[] | undefined>, keys: string[]) {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }
  return query;
}
