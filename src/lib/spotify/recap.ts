import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { rowsOf } from "@/db/rows";
import { addDaysKey, localDateKey, localToUtc } from "@/lib/time";
import { timezone } from "@/lib/tz";
import { topItems, type ChartItem } from "./charts";
import { listeningDays } from "./history";
import { local, rangeWhere, skipRates } from "./queries";
import { computeStreaks } from "./stats";
import { getInsights } from "./insights";

/** The local year of the earliest stored play, so the year picker offers only years with history. */
export async function firstListeningYear(fallback:number) {
  if (!hasDb()) return fallback;
  const [row] = rowsOf<{year:number|null}>(await db().execute(sql`SELECT extract(year FROM min(played_at) AT TIME ZONE ${timezone()})::int AS year FROM plays`));
  return Math.min(row?.year ?? fallback, fallback);
}

export function recapDates(year:number, today = localDateKey()) {
  const from = `${year}-01-01`;
  const to = year === Number(today.slice(0,4)) ? today : `${year}-12-31`;
  const [y,m,d] = addDaysKey(to,1).split("-").map(Number);
  return {from, to, range:{from:localToUtc(year,1,1), to:localToUtc(y,m,d)}};
}

function favourite(item:ChartItem | undefined) {
  return item ? {id:item.key, name:item.name, subtitle:item.subtitle, plays:item.streams, ms:Math.round(item.minutes*60000), imageUrl:item.cover, href:item.href} : null;
}

export async function loadRecap(year:number, today = localDateKey()) {
  const {from,to,range} = recapDates(year,today);
  const [days, artists, tracks, hours, repeats] = await Promise.all([
    listeningDays(from,to),
    topItems({kind:"artist",...range,sort:"time",limit:1}),
    topItems({kind:"track",...range,sort:"time",limit:1}),
    hasDb() ? db().execute(sql`SELECT extract(hour FROM ${local()})::int AS hour, sum(ms_played) AS ms FROM plays
      WHERE kind='track' AND ms_played > 0 AND ${rangeWhere(range)} GROUP BY 1 ORDER BY ms DESC,hour LIMIT 1`) : null,
    hasDb() ? db().execute(sql`SELECT count(*)::int AS streams, count(DISTINCT uri)::int AS tracks FROM plays
      WHERE kind='track' AND uri IS NOT NULL AND ms_played >= 30000 AND ${rangeWhere(range)}`) : null,
  ]);
  const active = days.filter(day=>day.minutes > 0);
  const repeat = repeats ? rowsOf<{streams:number;tracks:number}>(repeats)[0] : null;
  return {
    days, minutes: days.reduce((n,d)=>n+d.minutes,0), plays:days.reduce((n,d)=>n+d.plays,0),
    artist:favourite(artists[0]), track:favourite(tracks[0]), activeDays:active.length,
    peakHour:hours ? rowsOf<{hour:number}>(hours)[0]?.hour ?? null : null,
    longestStreak:computeStreaks(active.map(d=>d.day),to).longest,
    repeatShare:repeat?.streams ? Math.round(100*(repeat.streams-repeat.tracks)/repeat.streams) : null,
  };
}

export function getRecap(year:number) {
  const today = localDateKey();
  return unstable_cache(()=>loadRecap(year,today),["year-recap-v1",String(year),timezone(),recapDates(year,today).to],{tags:["spotify","insights"]})();
}

export function recapInsights(year:number, albumPage:number, streakPage:number) {
  const today = localDateKey();
  const {range,to} = recapDates(year,today);
  return unstable_cache(async()=>{
    const [lists,skips] = await Promise.all([
      getInsights(range,albumPage,streakPage),
      hasDb() ? skipRates(10,range,1) : Promise.resolve({tracks:[],artists:[]})
    ]);
    return {...lists,skips};
  },["year-highlights",String(year),String(albumPage),String(streakPage),timezone(),to],{tags:["spotify","insights"]})();
}
