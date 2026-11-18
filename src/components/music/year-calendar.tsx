"use client";

import { useState } from "react";
import Link from "next/link";
import { Heatmap } from "@/components/marks";
import type { ListeningDay } from "@/lib/spotify/history";

export function YearCalendar({ days, year, end }: { days: ListeningDay[]; year:number; end:string }) {
  const start = `${year}-01-01`;
  const [selected,setSelected] = useState(days[0]?.day ?? end);
  const day = days.find(d=>d.day === selected);
  const label = new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
  return <div className="min-w-0">
    <Heatmap data={days.map(d=>({date:d.day,value:d.minutes}))} start={start} end={end}
      activeDay={selected} onDay={setSelected} format={v=>`${Math.round(v)} min`}/>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-rule pt-4">
      <div aria-live="polite" aria-atomic="true">
        <p className="font-bold">{label}</p>
        <p className="mt-1 text-sm text-muted-text">{day ? `${Math.round(day.minutes)} min · ${day.plays} logged plays` : "No listening recorded."}</p>
        {day?.topTrack && <p className="mt-1 text-sm">Top song · {day.topTrack}</p>}
        {day?.topArtist && <p className="text-sm">Top artist · {day.topArtist}</p>}
        {day && <Link href={`/history?day=${selected}`} className="inline-flex min-h-11 items-center text-sm underline">Open this day in History →</Link>}
      </div>
      <label className="grid gap-1 text-xs text-muted-text">Choose a day
        <input type="date" min={start} max={end} value={selected} onChange={e=>{const date=e.target.value;if(date>=start && date<=end)setSelected(date);}} className="h-11 border border-strong bg-ground px-3 text-sm text-text"/>
      </label>
    </div>
  </div>;
}
