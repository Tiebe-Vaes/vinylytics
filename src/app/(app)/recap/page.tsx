import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/panel";
import { YearCalendar } from "@/components/music/year-calendar";
import { SpotifyAttribution } from "@/components/music/attribution";
import { Cover } from "@/components/sleeve/cover";
import { ShareButton } from "@/components/sleeve/share-button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstListeningYear, getRecap, recapDates, recapInsights } from "@/lib/spotify/recap";
import { listeningDays } from "@/lib/spotify/history";
import { localDateKey } from "@/lib/time";
import { timezone } from "@/lib/tz";

export const dynamic = "force-dynamic";
const number = (n:number) => Math.round(n).toLocaleString("en-GB");
const pageNumber = (v:unknown) => typeof v === "string" && /^[1-9]\d{0,4}$/.test(v) ? Number(v) : 1;
const clock = (hour:number) => `${String(hour%24).padStart(2,"0")}:00`;

export default async function RecapPage({searchParams}: {searchParams: Promise<{year?:string; albums?:string; streaks?:string}>}) {
  const p = await searchParams;
  const today = localDateKey();
  const thisYear = Number(today.slice(0,4));
  const firstYear = await firstListeningYear(thisYear);
  const requested = Number(p.year);
  const year = Number.isInteger(requested) && requested >= firstYear && requested <= thisYear ? requested : thisYear;
  const recap = await getRecap(year);
  const {to} = recapDates(year,today);
  return <>
    <PageHeader title="Year recap" description="Your year in music, drawn from your listening history." actions={<SpotifyAttribution/>}/>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <form action="/recap" className="flex items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-text">Listening year
          <select name="year" defaultValue={year} className="h-11 border border-strong bg-ground px-3 text-base font-semibold text-text">
            {Array.from({length:thisYear-firstYear+1},(_,i)=>thisYear-i).map(y=><option key={y}>{y}</option>)}
          </select>
        </label>
        <button className="h-11 border border-strong px-3 text-sm font-semibold hover:bg-muted">Show year</button>
      </form>
      {recap.plays > 0 && <ShareButton href={`/api/card/recap?year=${year}`} filename={`vinylytics-${year}-recap.png`} title={`${year} recap`} defaultInk="cobalt"/>}
    </div>
    <section className="grid gap-6 bg-ink-cobalt p-6 text-[#eeebe4] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end md:p-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest">{year}{year === thisYear ? " so far" : " in music"}</p>
        <h2 className="display mt-4 text-[clamp(3.75rem,12vw,8rem)] leading-none">{number(recap.minutes)}</h2>
        <p className="display text-2xl md:text-4xl">minutes of music</p>
      </div>
      {recap.artist && <Link href={recap.artist.href} className="group flex max-w-xs flex-col items-start gap-1">
        {recap.artist.imageUrl && <Cover url={recap.artist.imageUrl} alt="" size={128} className="mb-2 ring-0"/>}
        <span className="text-xs font-semibold uppercase tracking-wider">Most listened artist</span>
        <strong className="display break-words text-3xl group-hover:underline">{recap.artist.name} ↗</strong>
      </Link>}
    </section>
    {!recap.plays && <Empty>No music plays recorded for {year}. Choose another year or import your history in Settings.</Empty>}
    <div className="my-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      <Fact label="Days listening" value={number(recap.activeDays)} detail={`${number(recap.plays)} logged plays`}/>
      <Fact label="Longest listening streak" value={`${recap.longestStreak} days`} detail="Consecutive days with music"/>
      <Fact label="Peak listening hour" value={recap.peakHour === null ? "—" : `${clock(recap.peakHour)}–${clock(recap.peakHour+1)}`} detail={`Most minutes · ${timezone()}`}/>
      <Fact label="Repeat share" value={recap.repeatShare === null ? "—" : `${recap.repeatShare}%`} detail="Plays beyond each song’s first play this year, among identified songs played for 30s or more"/>
    </div>
    {recap.track && <Link href={recap.track.href} className="group mb-8 flex items-center gap-4 border-y border-rule py-4">
      <Cover url={recap.track.imageUrl} alt="" size={64}/>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-text">Most listened song · {number(recap.track.ms/60000)} min</p>
        <p className="display break-words text-3xl group-hover:underline">{recap.track.name}</p><p className="text-sm text-muted-text">{recap.track.subtitle}</p></div><ArrowUpRight aria-hidden/>
    </Link>}
    <Panel title="Every day" subtitle="Choose a date for its favourites and plays. Arrow keys move through the calendar.">
      <YearCalendar key={year} days={recap.days} year={year} end={to}/>
    </Panel>
    <Suspense fallback={<Skeleton className="mt-8 h-40"/>}><Highlights year={year} albumPage={pageNumber(p.albums)} streakPage={pageNumber(p.streaks)}/></Suspense>
    <Suspense fallback={<Skeleton className="mt-8 h-28"/>}><Memories today={today}/></Suspense>
  </>;
}

function Fact({label,value,detail}:{label:string;value:string;detail:string}) {
  return <div className="border-t border-rule pt-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-text">{label}</h3>
    <p className="display my-2 text-3xl">{value}</p><p className="text-xs text-muted-text">{detail}</p></div>;
}

async function Highlights({year,albumPage,streakPage}:{year:number;albumPage:number;streakPage:number}) {
  const {albumCompletion,artistStreaks,skips} = await recapInsights(year,albumPage,streakPage);
  const pagination = (field:"albums"|"streaks",page:number,more:boolean) => {
    const href = (v:number) => {
      const params = new URLSearchParams({year:String(year),albums:String(albumPage),streaks:String(streakPage)});
      params.set(field,String(v));
      return `/recap?${params}#${field}`;
    };
    return (page > 1 || more) && <nav aria-label={`${field} pages`} className="mt-3 flex min-h-11 items-center gap-4 text-sm">
      {page > 1 && <Link href={href(page-1)} className="underline">Previous</Link>}<span>Page {page}</span>{more && <Link href={href(page+1)} className="underline">Next</Link>}
    </nav>;
  };
  return <div className="mt-10 grid gap-8 md:grid-cols-2">
    <Panel title="Most skipped" subtitle="Highest skip rate among songs and artists with at least ten export plays carrying a skip flag. Ties go to more plays, then item ID or artist name." className="md:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">{([["Song",skips.tracks[0]],["Artist",skips.artists[0]]] as const).map(([kind,item])=>
        <div key={kind} className="border-l-2 border-ink-cobalt pl-4"><p className="text-xs text-muted-text">{kind}</p>
          {item ? <><p className="display break-words text-3xl">{item.name}</p><p className="text-sm">{Math.round(item.skipRate*100)}% skipped · {number(item.plays)} known plays</p></> : <p className="text-sm">No eligible {kind.toLowerCase()} with a recorded skip.</p>}</div>)}</div>
    </Panel>
    <div id="albums"><Panel title="Album completion" subtitle={`Different tracks played for 30s or more in ${year}, out of the album’s track count.`}>
      {albumCompletion.length === 0 ? <Empty>{albumPage > 1 ? "No more albums on this page." : `No album has three or more of its tracks played in ${year} yet. Album track counts arrive with artwork.`}</Empty> : <ol>{albumCompletion.slice(0,10).map(a=>
        <li key={a.albumId}><Link href={`/album/${encodeURIComponent(a.albumId)}`} className="flex min-h-11 items-center justify-between gap-2 border-b border-rule py-2 text-sm hover:underline"><span>{a.name} · {a.artist}</span><strong>{a.played}/{a.total}</strong></Link></li>)}</ol>}
      {pagination("albums",albumPage,albumCompletion.length>10)}
    </Panel></div>
    <div id="streaks"><Panel title="Artist streaks" subtitle="Consecutive days with at least one 30-second play by the same artist.">
      {artistStreaks.length === 0 ? <Empty>No multi-day streaks on this page.</Empty> : <ol>{artistStreaks.slice(0,10).map(a=>
        <li key={a.artist}><Link href={`/artist/${encodeURIComponent(a.artist)}`} className="flex min-h-11 items-center justify-between gap-2 border-b border-rule py-2 text-sm hover:underline"><span>{a.artist}</span><strong>{a.days}d</strong></Link></li>)}</ol>}
      {pagination("streaks",streakPage,artistStreaks.length>10)}
    </Panel></div>
  </div>;
}

async function Memories({today}:{today:string}) {
  const days = await listeningDays("2008-01-01",`${Number(today.slice(0,4))-1}-12-31`,today.slice(5));
  return <Panel title="On this day" subtitle="Today’s date in earlier years, across your library." className="mt-10">
    {days.length ? <ul>{days.map(d=><li key={d.day}><Link href={`/history?day=${d.day}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule py-3 hover:underline">
      <strong className="display text-2xl">{d.day.slice(0,4)}</strong><span>{d.topTrack || "Listening day"}</span>{d.topArtist && <small>Top artist · {d.topArtist}</small>}<small className="text-muted-text">{number(d.minutes)} min</small>
    </Link></li>)}</ul> : <Empty>No earlier plays recorded on this date.</Empty>}
  </Panel>;
}
