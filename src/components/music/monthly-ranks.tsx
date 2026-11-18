"use client";

import { useState } from "react";
import type { ItemStats } from "@/lib/spotify/item-stats";

export function MonthControls({order, limit, setOrder, setLimit, most = "Most plays first"}:{
  order:string; limit:number; setOrder:(v:string)=>void; setLimit:(n:number)=>void; most?:string
}) {
  return <div className="my-3 flex flex-wrap gap-4">
    <label className="grid gap-1 text-xs text-muted-text">Month order
      <select value={order} onChange={e=>setOrder(e.target.value)} className="min-h-11 border border-strong bg-ground px-2 text-sm text-text">
        <option value="recent">Recent months</option><option value="most">{most}</option><option value="oldest">Oldest first</option>
      </select>
    </label>
    <label className="grid gap-1 text-xs text-muted-text">Months shown
      <select value={limit} onChange={e=>setLimit(Number(e.target.value))} className="min-h-11 border border-strong bg-ground px-2 text-sm text-text">
        {[6,12,24,48].map(n=><option key={n}>{n}</option>)}<option value={0}>All</option>
      </select>
    </label>
  </div>;
}

/** `size` is the measure the view shows, so "most first" sorts by what you see. */
export function orderMonths<T extends {month:string}>(months:T[], order:string, limit:number, size:(m:T)=>number) {
  const sorted = [...months].sort((a,b)=>{
    if (order === "oldest") return a.month.localeCompare(b.month);
    if (order === "most" && size(a) !== size(b)) return size(b)-size(a);
    return b.month.localeCompare(a.month);
  });
  return limit ? sorted.slice(0,limit) : sorted;
}

export function MonthlyRanks({rows}:{rows:ItemStats["rankByMonth"]}) {
  const [order,setOrder] = useState("recent");
  const [limit,setLimit] = useState(12);
  return <>
    <MonthControls {...{order,limit,setOrder,setLimit}}/>
    <ol className="grid gap-x-5 sm:grid-cols-2 md:grid-cols-3">
      {orderMonths(rows,order,limit,m=>m.streams).map(m=><li key={m.month} className="flex items-baseline gap-2 border-b border-rule py-2 text-sm">
        <strong className="display text-2xl">#{m.rank}</strong>
        <span>{new Date(`${m.month}-15T12:00:00Z`).toLocaleDateString("en-GB",{month:"short",year:"numeric",timeZone:"UTC"})}</span>
        <small className="ml-auto text-muted-text">{m.streams} {m.streams === 1 ? "play" : "plays"}</small>
      </li>)}
    </ol>
  </>;
}
