import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { topItems } from "@/lib/spotify/charts";
import { pageQuery, parseChartFilters } from "@/lib/spotify/chart-filters";
import { chartPatterns } from "@/lib/spotify/chart-patterns";
import type { Range } from "@/lib/spotify/types";
import { CHART_KEYS, ChartsView, PatternsView } from "./charts-view";

export const dynamic = "force-dynamic";

export default async function ChartsPage({searchParams}: {searchParams: Promise<Record<string,string | string[] | undefined>>}) {
  const query = pageQuery(await searchParams, CHART_KEYS);
  const {kind,sort,window,valid} = parseChartFilters(query);
  const items = valid ? await topItems({kind,sort,from:window?.from ?? null,to:window?.to ?? null,limit:20}) : [];
  return <ChartsView query={query} items={items} patterns={<Suspense fallback={<Skeleton className="mt-10 h-56"/>}><Patterns range={window}/></Suspense>}/>;
}

async function Patterns({range}: {range:Range}) {
  return <PatternsView {...await chartPatterns(range)}/>;
}
