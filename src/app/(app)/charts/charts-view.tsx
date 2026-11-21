import { ViewTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { ArtistBump } from "@/components/music/artist-bump";
import { Genres } from "@/components/music/genres";
import { KindSplit } from "@/components/music/kind-split";
import { MinutesChart } from "@/components/music/minutes-chart";
import { RangeSelect } from "@/components/music/range-select";
import { SentenceFilter } from "@/components/music/sentence-filter";
import { chartSentence } from "@/lib/spotify/chart-sentence";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Cover } from "@/components/sleeve/cover";
import { Tilt } from "@/components/motion/tilt";
import { ShareButton } from "@/components/sleeve/share-button";
import { CHART_RANGES } from "@/lib/spotify/data";
import type { ChartItem } from "@/lib/spotify/charts";
import { parseChartFilters } from "@/lib/spotify/chart-filters";
import type { chartPatterns } from "@/lib/spotify/chart-patterns";
import { hashInk, inkHex, inkText } from "@/lib/ink";
import { localDateKey } from "@/lib/time";

const kinds = [{value:"artist",label:"Artists"}, {value:"track",label:"Songs"}, {value:"album",label:"Albums"}];
const views = [{value:"grid",label:"Grid"}, {value:"list",label:"List"}];
const sorts = [{value:"time",label:"Minutes"}, {value:"plays",label:"Plays"}];
const ranges = [...CHART_RANGES, {value:"custom",label:"Custom"}];
const rangeWord = (v:string) => ({"4w":"last 4 weeks","6m":"last 6 months","1y":"last year",all:"all time"} as Record<string,string>)[v] ?? v;

export const CHART_KEYS = ["range","from","to","sort","kind","view"];

/** The charts page body. The server page and the browser build load the data
 * their own way and render this. `patterns` fills the section under the list. */
export function ChartsView({query, items, patterns}: {query: URLSearchParams; items: ChartItem[]; patterns: React.ReactNode}) {
  const {kind,sort,range,from,to,valid} = parseChartFilters(query);
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
  const title = `Top ${kinds.find(k => k.value === kind)?.label.toLowerCase()}`;
  const sentence = chartSentence({kind,range,sort,from,to});
  return <>
    <PageHeader title="Charts" description="Your record collection, ranked." actions={<SpotifyAttribution/>}/>
    {/* Lowercase words read as a sentence; "last" makes presets read naturally. */}
    <SentenceFilter max={localDateKey()}
      kind={{name:"Chart type", value:kind, label:kinds.find(k=>k.value===kind)!.label.toLowerCase(), options:kinds.map(k=>({value:k.value,label:k.label.toLowerCase(),href:href("kind",k.value)}))}}
      range={{name:"Date range", value:range, label:range === "custom" ? sentence.replace(/^Top \w+ from (.*) by \w+$/,"$1") : rangeWord(range), options:ranges.filter(r=>r.value!=="custom").map(r=>({value:r.value,label:rangeWord(r.value),href:href("range",r.value)}))}}
      sort={{name:"Rank by", value:sort, label:sorts.find(o=>o.value===sort)!.label.toLowerCase(), options:sorts.map(o=>({value:o.value,label:o.label.toLowerCase(),href:href("sort",o.value)}))}}
      custom={{from, to, hidden:{kind, sort, view}}}/>
    {!valid && <p role="alert" className="py-4 text-sm">Choose a valid start and end date through today. The end date must follow or match the start. <Link href={href("range","4w")} className="font-semibold underline">Reset to the last 4 weeks</Link></p>}
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <RangeSelect label="Layout" options={views} value={view} href={v=>href("view",v)}/>
          {items.length > 0 && <ShareButton href={`/api/card/top?${filter}&view=${view}`} filename={`vinylytics-${kind}-${range}.png`} title={title} scope={sentence}
            preview={{ cover: "Number one artwork", period: range === "custom" ? `${from} – ${to}` : ranges.find(r => r.value === range)?.label, lead: items[0].name, stat: sort === "time" ? `${Math.round(items[0].minutes).toLocaleString("en-GB")} min at no. 1` : `${items[0].streams.toLocaleString("en-GB")} plays at no. 1`, rows: "Top five" }}/>}
        </div>
      </div>
      {valid && !items.length && <Empty>No {title.toLowerCase().replace("top ","")} in this period.{kind === "album" ? " Albums appear as Spotify metadata arrives." : " Try a wider date range."}</Empty>}
      <ol aria-label={title} className={view === "grid" ? "grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5" : ""}>
        {items.map((item,i)=>{
          // Coloured by artist, so one artist's songs group visually instead of reading as duplicates.
          const artist = item.subtitle || item.name;
          const bg = inkHex(hashInk(artist));
          const metric = sort === "time" ? `${Math.round(item.minutes).toLocaleString("en-GB")} min` : `${item.streams.toLocaleString("en-GB")} ${item.streams === 1 ? "play" : "plays"}`;
          // Same name before and after a sort change, so the row glides to its new rank.
          return <li key={item.key} className="min-w-0"><ViewTransition name={`rank-${item.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`}><Link href={item.href} className={`group ${view === "grid" ? "block h-full" : "flex items-center gap-3 border-t border-rule py-2 hover:bg-muted"}`}>
            {view === "grid" ? <Tilt><div className="relative grid aspect-square place-items-center overflow-hidden" style={{background:bg,color:inkText(bg)}}>
              {item.cover ? <Cover url={item.cover} alt="" size={160} className="size-full! ring-0"/> : <Cover url={null} alt="" seed={artist} size={160} className="size-full! ring-0"/>}
              <span className="nums absolute top-0 left-0 bg-ground px-2 py-1 text-sm font-bold text-text">#{i+1}</span>
            </div></Tilt> : <><span className="nums w-8 shrink-0 text-lg font-bold text-muted-text">{i+1}</span><Cover url={item.cover} alt="" size={42} seed={artist}/></>}
            <div className={view === "grid" ? "mt-2" : "min-w-0 flex-1"}>
              <div className="flex items-start justify-between gap-1"><strong className="link-underline break-words leading-snug">{item.name}</strong><ArrowUpRight className="hover-reveal mt-1 size-4 shrink-0 text-muted-text" aria-hidden /></div>
              {item.subtitle && <small className="block break-words text-muted-text">{item.subtitle}</small>}
              <small className="nums block text-muted-text">{metric}</small>
            </div>
          </Link></ViewTransition></li>;
        })}
      </ol>
    </section>
    {valid && patterns}
  </>;
}

export function PatternsView({bump, months, genres, kinds}: Awaited<ReturnType<typeof chartPatterns>>) {
  // Two bars or a two-point line say nothing about change over time.
  const fewMonths = <Empty>Pick a range of three months or more to see this.</Empty>;
  return <div className="mt-12 grid gap-9">
    {months.length >= 3 ? <MinutesChart byMonth={months}/> : <Panel title="Minutes per month">{fewMonths}</Panel>}
    <Panel title="Top artists over time" subtitle={`The five leading artists by listening time, ranked against each other each ${bump.unit}.`}>
      {bump.months.length < 3 ? fewMonths : <ArtistBump bump={bump}/>}
    </Panel>
    <div className="grid gap-8 md:grid-cols-2">
      <Panel title="Genre mix">{genres.length ? <Genres genres={genres}/> : <Empty>Genres appear as artist tags become available.</Empty>}</Panel>
      <Panel title="Listening by format">{kinds.length ? <KindSplit kinds={kinds}/> : <Empty>No listening in this period.</Empty>}</Panel>
    </div>
  </div>;
}
