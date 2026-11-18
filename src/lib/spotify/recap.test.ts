import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { useTestDb,resetDb } from "@/db/test-db";
import { plays,albums,tracks } from "@/db/schema";
import { loadRecap,recapDates } from "./recap";
import { searchLibrary } from "./library-search";
import { parseChartFilters } from "./chart-filters";
import { artistTrend } from "./chart-patterns";
import { skipRates } from "./queries";

let d:Awaited<ReturnType<typeof useTestDb>>;
beforeAll(async()=>{d=await useTestDb();});
beforeEach(resetDb);
afterEach(()=>vi.unstubAllEnvs());
const play = (at:string,artist:string,uri:string,min=1) => ({
  playedAt:new Date(at),artistName:artist,uri,kind:"track",trackName:"Tape "+uri.split(":").at(-1),msPlayed:min*60000,source:"export"
});

it("uses local inclusive dates for year totals, peak hour and streak, excluding future local days",async()=>{
  vi.stubEnv("TIMEZONE","Europe/Brussels");
  await d.insert(plays).values([
    play("2024-12-31T22:58:00Z","Earlier","spotify:track:earlier",55),
    play("2024-12-31T23:01:00Z","A/B","spotify:track:1",3),play("2025-01-01T23:03:00Z","A/B","spotify:track:1",3),
    play("2025-01-02T12:00:00Z","Also","spotify:track:2",2),play("2025-01-02T23:01:00Z","Later","spotify:track:3",55),
  ]);
  expect(await loadRecap(2025,"2025-01-02")).toMatchObject({minutes:8,plays:3,activeDays:2,longestStreak:2,peakHour:0,repeatShare:33,
    artist:{name:"A/B"},track:{id:"spotify:track:1"}});
});

it("reports empty metrics honestly",async()=>{
  expect(await loadRecap(2025,"2026-01-01")).toMatchObject({minutes:0,plays:0,peakHour:null,artist:null,track:null,repeatShare:null,longestStreak:0});
});

it("handles DST windows and rejects impossible or inverted custom dates",()=>{
  vi.stubEnv("TIMEZONE","Europe/Brussels");
  const parse = (from:string,to:string)=>parseChartFilters(new URLSearchParams({range:"custom",from,to}),new Date("2026-04-01T12:00:00Z"));
  const range = parse("2026-03-29","2026-03-29").window!;
  expect(range.to.getTime()-range.from.getTime()).toBe(23*3600000);
  expect(parse("2026-02-30","2026-03-30").valid).toBe(false);
  expect(parse("2026-03-30","2026-03-29").valid).toBe(false);
});

it("matches literal special characters and returns links only for items present in this library", async()=>{
  await d.insert(plays).values([play("2025-01-01T12:00:00Z","100% / Æ","spotify:track:local")]);
  await d.insert(albums).values([{id:"matched",name:"Tape 01"},{id:"unheard",name:"Tape 02"}]);
  await d.insert(tracks).values([{uri:"spotify:track:local",albumId:"matched"}]);
  expect(await searchLibrary("%")).toMatchObject([{kind:"artist",href:"/artist/100%25%20%2F%20%C3%86"}]);
  expect((await searchLibrary("tape")).map(r=>r.href)).toEqual(["/album/matched","/track/local"]);
  expect(await searchLibrary(" ")).toEqual([]);
});

it("filters skip evidence to the year, excludes API/unknown flags, and resolves ties by stable key",async()=>{
  const rows = ["a","b"].flatMap(uri=>Array.from({length:10},(_,i)=>({
    ...play(`2025-06-01T12:${String(i).padStart(2,"0")}:00Z`,uri,uri),skipped:i<6
  })));
  await d.insert(plays).values([...rows,{...play("2025-06-01T18:00:00Z","b","b"),skipped:true,source:"api"},
    {...play("2024-06-01T19:00:00Z","b","b"),skipped:true},{...play("2025-06-01T20:00:00Z","b","b"),skipped:null}]);
  const skips = await skipRates(10,recapDates(2025,"2026-01-01").range,1);
  expect(skips.artists).toEqual([{name:"a",subtitle:"",plays:10,skipRate:0.6}]);
  expect(skips.tracks).toHaveLength(1);
});

it("aggregates a long artist trend before ranking the top five",()=>{
  const rows = Array.from({length:7},(_,i)=>({artist:"Artist "+i,month:"2013-01",minutes:i+1}));
  const trend = artistTrend([...rows,{artist:"Artist 2",month:"2025-03",minutes:10}]);
  expect(trend).toMatchObject({unit:"year",months:["2013","2025"]});
  expect(trend.artists).toHaveLength(5);
  expect(trend.artists[0]).toBe("Artist 2");
});
