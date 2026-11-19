"use client";

import { useQuery } from "@tanstack/react-query";
import { VinylLoader } from "@/components/vinyl-loader";
import { openDb } from "./db";

/** Holds the page until the local database is open. The first visit downloads
 * the Postgres WASM (several seconds); later visits open from the cache. */
export function DbGate({ children }: { children: React.ReactNode }) {
  const { status, error } = useQuery({ queryKey: ["browser-db"], queryFn: openDb, staleTime: Infinity, retry: false });
  if (status === "error") {
    return <p role="alert" className="py-16 text-center text-sm">
      This browser could not open the local database: {error instanceof Error ? error.message : "unknown error"}. Private windows often block it.
    </p>;
  }
  if (status !== "success") return <VinylLoader label="Opening your record shelf…" className="py-24" />;
  return children;
}
