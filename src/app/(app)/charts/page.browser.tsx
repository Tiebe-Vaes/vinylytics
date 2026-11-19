"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { topItems } from "@/lib/spotify/charts";
import { parseChartFilters } from "@/lib/spotify/chart-filters";
import { chartPatterns } from "@/lib/spotify/chart-patterns";
import { CHART_KEYS, ChartsView, PatternsView } from "./charts-view";

function BrowserCharts() {
  const params = useSearchParams();
  const query = new URLSearchParams([...params].filter(([k]) => CHART_KEYS.includes(k)));
  const {kind,sort,window,valid} = parseChartFilters(query);
  const from = window?.from ?? null, to = window?.to ?? null;
  const items = useQuery({
    queryKey: ["charts", kind, sort, from?.toISOString(), to?.toISOString()],
    queryFn: () => topItems({kind,sort,from,to,limit:20}),
    enabled: valid,
  });
  const patterns = useQuery({
    queryKey: ["chart-patterns", from?.toISOString(), to?.toISOString()],
    queryFn: () => chartPatterns(window),
    enabled: valid,
  });
  if (valid && !items.data) return <Skeleton className="mt-10 h-96"/>;
  return <ChartsView query={query} items={items.data ?? []}
    patterns={patterns.data ? <PatternsView {...patterns.data}/> : <Skeleton className="mt-10 h-56"/>}/>;
}

// useSearchParams needs a Suspense boundary in a static export.
export default function BrowserChartsPage() {
  return <Suspense><BrowserCharts/></Suspense>;
}
