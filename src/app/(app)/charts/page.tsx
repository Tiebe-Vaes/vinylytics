import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtistBump } from "@/components/music/artist-bump";
import { Genres } from "@/components/music/genres";
import { KindSplit } from "@/components/music/kind-split";
import { MinutesChart } from "@/components/music/minutes-chart";
import { RangeSelect } from "@/components/music/range-select";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Cover } from "@/components/sleeve/cover";
import { ShareButton } from "@/components/sleeve/share-button";
import { CHART_RANGES } from "@/lib/spotify/data";
import { topItems } from "@/lib/spotify/charts";
import { pageQuery, parseChartFilters } from "@/lib/spotify/chart-filters";
import { chartPatterns } from "@/lib/spotify/chart-patterns";
import { hashInk, inkHex, inkText } from "@/lib/ink";
import { localDateKey } from "@/lib/time";
import type { Range } from "@/lib/spotify/types";

export const dynamic = "force-dynamic";
const kinds = [{value:"artist",label:"Artists"}, {value:"track",label:"Songs"}, {value:"album",label:"Albums"}];
const views = [{value:"grid",label:"Grid"}, {value:"list",label:"List"}];
const sorts = [{value:"time",label:"Minutes"}, {value:"plays",label:"Plays"}];
const ranges = [...CHART_RANGES, {value:"custom",label:"Custom"}];

export default async function ChartsPage({searchParams}: {searchParams: Promise<Record<string,string | string[] | undefined>>}) {
  const query = pageQuery(await searchParams, ["range","from","to","sort","kind","view"]);
  const {kind,sort,range,from,to,window,valid} = parseChartFilters(query);
  const view = query.get("view") === "list" ? "list" : "grid";
  const filter = new URLSearchParams({kind,sort,range});
  if (range === "custom") { filter.set("from",from); filter.set("to",to); }
  const href = (key:string,value:string) => {
    const next = new URLSearchParams(filter);
    next.set("view", view);
    next.set(key,value);
    if(next.get("range") !== "custom"){ next.delete("from"); next.delete("to"); }
    return `/charts?${next}`;
  };
  const items = valid ? await topItems({kind,sort,from:window?.from ?? null,to:window?.to ?? null,limit:20}) : [];
  const title = `Top ${kinds.find(k => k.value === kind)?.label.toLowerCase()}`;
  return <>
    <PageHeader title="Charts" description="Your record collection, ranked." actions={<SpotifyAttribution/>}/>
    <div className="flex flex-wrap items-end justify-between gap-4 border-y border-rule py-3">
      <div className="grid gap-1"><span className="text-xs text-muted-text">Ranking</span><RangeSelect label="Chart type" options={kinds} value={kind} href={v=>href("kind",v)}/></div>
      <div className="grid gap-1"><span className="text-xs text-muted-text">Period</span><RangeSelect label="Date range" options={ranges} value={range} href={v=>href("range",v)}/></div>
      <div className="grid gap-1"><span className="text-xs text-muted-text">Rank by</span><RangeSelect label="Rank by" options={sorts} value={sort} href={v=>href("sort",v)}/></div>
    </div>
    {range === "custom" && <form action="/charts" className="my-4 flex flex-wrap items-end gap-3 text-sm">
      {Object.entries({range,kind,sort,view}).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}
      {([["from",from],["to",to]] as const).map(([name,value])=><label key={name} className="grid gap-1 capitalize">{name}
        <input required type="date" name={name} max={localDateKey()} defaultValue={value} className="h-11 border border-strong bg-ground px-2"/>
      </label>)}
      <button className="h-11 bg-text px-4 font-semibold text-ground">Apply dates</button>
    </form>}
    {!valid && <p role="alert" className="py-4 text-sm">Choose a valid start and end date through today. The end date must follow or match the start.</p>}
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-3xl">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <RangeSelect label="Layout" options={views} value={view} href={v=>href("view",v)}/>
          {items.length > 0 && <ShareButton href={`/api/card/top?${filter}`} filename={`vinylytics-${kind}-${range}.png`} title={title}/>}
        </div>
      </div>
      {valid && !items.length && <Empty>No {title.toLowerCase().replace("top ","")} in this period.{kind === "album" ? " Albums appear as Spotify metadata arrives." : " Try a wider date range."}</Empty>}
      <ol aria-label={title} className={view === "grid" ? "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5" : ""}>
        {items.map((item,i)=>{
          const bg = inkHex(hashInk(item.key));
          const metric = sort === "time" ? `${Math.round(item.minutes).toLocaleString("en-GB")} min` : `${item.streams.toLocaleString("en-GB")} ${item.streams === 1 ? "play" : "plays"}`;
          return <li key={item.key} className="min-w-0"><Link href={item.href} className={`group ${view === "grid" ? "block h-full" : "flex items-center gap-3 border-t border-rule py-2 hover:bg-muted"}`}>
            {view === "grid" ? <div className="relative grid aspect-square place-items-center overflow-hidden" style={{background:bg,color:inkText(bg)}}>
              {item.cover ? <Cover url={item.cover} alt="" size={160} className="size-full! ring-0"/> : <span aria-hidden className="display text-7xl sm:text-8xl">{String(i+1).padStart(2,"0")}</span>}
              {item.cover && <span className="absolute bottom-0 left-0 bg-ground px-2 py-1 text-xs font-bold text-text">#{i+1}</span>}
            </div> : <><span className="display w-8 shrink-0 text-2xl">{i+1}</span><Cover url={item.cover} alt="" size={42}/></>}
            <div className={view === "grid" ? "mt-2" : "min-w-0 flex-1"}>
              <div className="flex items-start justify-between gap-1"><strong className="break-words leading-snug group-hover:underline">{item.name}</strong><ArrowUpRight className="size-4 shrink-0 text-muted-text" aria-hidden /></div>
              {item.subtitle && <small className="block break-words text-muted-text">{item.subtitle}</small>}
              <small className="nums block text-muted-text">{metric}</small>
            </div>
          </Link></li>;
        })}
      </ol>
    </section>
    {valid && <Suspense fallback={<Skeleton className="mt-10 h-56"/>}><Patterns range={window}/></Suspense>}
  </>;
}

async function Patterns({range}: {range:Range}) {
  const {bump, months, genres, kinds} = await chartPatterns(range);
  return <div className="mt-12 grid gap-9">
    <MinutesChart byMonth={months}/>
    <Panel title="Top artists over time" subtitle={`The five leading artists by listening time, ranked against each other each ${bump.unit}.`}>
      {bump.months.length < 2 ? <Empty>Listen across two periods to see how your favourites trade places.</Empty> : <ArtistBump bump={bump}/>}
    </Panel>
    <div className="grid gap-8 md:grid-cols-2">
      <Panel title="Genre mix">{genres.length ? <Genres genres={genres}/> : <Empty>Genres appear as artist tags become available.</Empty>}</Panel>
      <Panel title="Listening by format">{kinds.length ? <KindSplit kinds={kinds}/> : <Empty>No listening in this period.</Empty>}</Panel>
    </div>
  </div>;
}
