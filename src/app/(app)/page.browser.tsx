"use client";

import { useEffect } from "react";
import { sql } from "drizzle-orm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/panel";
import { SpotifyImport } from "@/components/music/spotify-import";
import { VinylLoader } from "@/components/vinyl-loader";
import { startImport, useImport } from "@/lib/spotify/import-runner";
import { takeHandoff } from "@/browser/handoff";
import { browserPage } from "@/browser/render-page";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";
import ShelfPage from "./page";

const Shelf = browserPage(ShelfPage);

/** Browser build start page: the shelf once there are plays, the import until then. */
export default function BrowserHome() {
  const state = useImport();
  const client = useQueryClient();
  const { data: plays } = useQuery({
    queryKey: ["browser-play-count"],
    queryFn: async () => rowsOf<{ n: number }>(await db().execute(sql`SELECT count(*)::int AS n FROM plays`))[0].n,
  });
  // Fresh plays: every cached query is stale now.
  useEffect(() => { if (state.status === "done") void client.invalidateQueries(); }, [state.status, client]);
  // Arrived from the get-started dropzone: import the files it handed over.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("import")) return;
    url.searchParams.delete("import");
    window.history.replaceState(null, "", url);
    void takeHandoff().then((files) => { if (files.length) void startImport(files); });
  }, []);

  if (plays === undefined) return <VinylLoader label="Opening your record shelf…" className="py-24" />;
  if (plays > 0) return <Shelf />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your record shelf"
        description="Drop in Spotify's Extended Streaming History (spotify.com → Account → Privacy, up to 30 days) or Apple Music's play activity (privacy.apple.com → Get a copy of your data)."
      />
      <p className="text-sm text-muted-text">
        Your history lives only in this browser. Nothing is uploaded. Clearing this site&apos;s data removes it.
      </p>
      <SpotifyImport />
    </div>
  );
}
