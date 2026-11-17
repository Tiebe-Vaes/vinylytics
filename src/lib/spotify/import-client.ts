"use client";

import { strFromU8, unzipSync } from "fflate";
import { isExportAudioFile, parseExportFile } from "./export";
import type { PlayWire } from "./types";

export type ImportProgress = {
  phase: "reading" | "unzipping" | "parsing" | "uploading" | "done" | "error";
  message: string;
  /** 0-1, or null when the phase has no measurable progress. */
  fraction: number | null;
};

/**
 * Reads the export in the browser: the ZIP is far past Vercel's 4.5 MB body
 * limit, and only the fields in PlayWire should ever leave this device.
 */

const CHUNK = 1000;

async function readEntries(files: File[]): Promise<{ name: string; content: string }[]> {
  const out: { name: string; content: string }[] = [];
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f) => isExportAudioFile(f.name) && f.size > 0,
      });
      for (const [name, bytes] of Object.entries(unzipped)) out.push({ name, content: strFromU8(bytes) });
    } else if (isExportAudioFile(file.name)) {
      out.push({ name: file.name, content: await file.text() });
    }
  }
  return out;
}

export async function importSpotifyFiles(
  files: File[],
  onProgress: (p: ImportProgress) => void
): Promise<{ files: number; plays: number; written: number }> {
  onProgress({ phase: "unzipping", message: "Reading files…", fraction: null });
  const entries = await readEntries(files);
  if (entries.length === 0) {
    throw new Error(
      "No listening history found. Expected the Extended Streaming History ZIP, or Streaming_History_Audio_*.json files."
    );
  }

  onProgress({ phase: "parsing", message: `Parsing ${entries.length} file${entries.length > 1 ? "s" : ""}…`, fraction: null });
  const plays: PlayWire[] = [];
  for (const e of entries) {
    let json: unknown;
    try {
      json = JSON.parse(e.content);
    } catch {
      throw new Error(`${e.name} is not valid JSON.`);
    }
    for (const r of parseExportFile(json)) plays.push({ ...r, playedAt: r.playedAt.toISOString() });
  }
  if (plays.length === 0) throw new Error("The files parsed, but held no plays.");

  const batchId = crypto.randomUUID();
  let written = 0;
  for (let i = 0; i < plays.length; i += CHUNK) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plays: plays.slice(i, i + CHUNK), batchId, final: i + CHUNK >= plays.length }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Upload failed at ${i.toLocaleString("en-GB")} of ${plays.length.toLocaleString("en-GB")}: ${detail.slice(0, 200)}`);
    }
    written += ((await res.json()) as { written?: number }).written ?? 0;
    const done = Math.min(i + CHUNK, plays.length);
    onProgress({
      phase: "uploading",
      message: `Saving ${done.toLocaleString("en-GB")} of ${plays.length.toLocaleString("en-GB")} plays…`,
      fraction: done / plays.length,
    });
  }

  onProgress({ phase: "done", message: "Import complete.", fraction: 1 });
  return { files: entries.length, plays: plays.length, written };
}
