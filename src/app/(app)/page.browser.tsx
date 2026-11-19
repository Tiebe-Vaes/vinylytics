"use client";

import { useEffect } from "react";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/panel";
import { SpotifyImport } from "@/components/music/spotify-import";
import { startImport, useImport } from "@/lib/spotify/import-runner";
import { takeHandoff } from "@/browser/handoff";
import { db } from "@/db";
import { rowsOf } from "@/db/rows";

/** Browser build start page: import the export, then open the charts. */
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your record shelf"
        description="Drop in Spotify's Extended Streaming History. Request it at spotify.com → Account → Privacy; Spotify takes up to 30 days."
      />
      <p className="text-sm text-muted-text">
        Your history lives only in this browser. Nothing is uploaded. Clearing this site&apos;s data removes it.
      </p>
      {plays ? (
        <p className="text-sm">
          <strong className="nums">{plays.toLocaleString("en-GB")}</strong> plays on the shelf.{" "}
          <Link href="/charts" className="font-semibold underline">Open your charts</Link>
        </p>
      ) : null}
      <SpotifyImport />
    </div>
  );
}
