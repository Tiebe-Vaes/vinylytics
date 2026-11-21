import { strFromU8, Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { isExportAudioFile, parseExportFile } from "./export";
import { isAppleActivityFile, parseAppleActivity } from "@/lib/apple/play-activity";
import type { PlayWire } from "./types";

const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
// shortcut: Apple's play activity CSV is one file with ~145 columns, so it gets a larger cap and is parsed whole; stream it by line if real exports run past this.
const MAX_APPLE_BYTES = 256 * 1024 * 1024;
const wanted = (name: string) => isExportAudioFile(name) || isAppleActivityFile(name);
const cap = (name: string) => (isAppleActivityFile(name) ? MAX_APPLE_BYTES : MAX_ENTRY_BYTES);
const CHUNK = 1000;

export type PrepareStage = "reading" | "unpacking" | "preparing";

/** Stream ZIP input and discard unrelated members. Only one audio file and a
 * bounded decompression window are in memory between writes to IndexedDB. */
async function unpack(file: File, consume: (text: string, name: string) => Promise<void>) {
  const ready: [string, Uint8Array[]][] = [];
  const archive = new Unzip((entry: UnzipFile) => {
    if (!wanted(entry.name)) return;
    let bytes = 0;
    const parts: Uint8Array[] = [];
    entry.ondata = (err, data, final) => {
      if (err) throw err;
      bytes += data.length;
      if (bytes > cap(entry.name)) throw new Error(`A history file exceeds the ${cap(entry.name) / 1024 / 1024} MB per-file limit.`);
      parts.push(data);
      if (final) ready.push([entry.name, parts]);
    };
    entry.start();
  });
  archive.register(UnzipInflate);
  // Slice input deliberately: a browser stream may yield an entire large Blob.
  for (let i = 0; i < file.size; i += 32_768) {
    const end = Math.min(i + 32_768, file.size);
    archive.push(new Uint8Array(await file.slice(i, end).arrayBuffer()), end === file.size);
    for (const [name, parts] of ready.splice(0)) {
      const decoder = new TextDecoder();
      await consume(parts.map(part => decoder.decode(part, { stream: true })).join("") + decoder.decode(), name);
    }
  }
}

export async function prepareImport(
  files: File[],
  stage: (offset: number, batch: PlayWire[]) => Promise<void>,
  progress: (phase: PrepareStage, count: number) => void,
) {
  let total = 0;
  let entries = 0;
  async function consume(text: string, name: string) {
    entries++;
    progress("preparing", total);
    let plays;
    if (isAppleActivityFile(name)) plays = parseAppleActivity(text);
    else {
      let json: unknown;
      try { json = JSON.parse(text); }
      catch { throw new Error("A history file contains invalid JSON. Choose a fresh copy of the export."); }
      plays = parseExportFile(json);
    }
    for (let i = 0; i < plays.length; i += CHUNK) {
      const batch = plays.slice(i, i + CHUNK).map(p => ({ ...p, playedAt: p.playedAt.toISOString() }));
      await stage(total, batch);
      total += batch.length;
      progress("preparing", total);
    }
  }
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      progress("unpacking", total);
      await unpack(file, consume);
    } else if (wanted(file.name)) {
      progress("reading", total);
      if (file.size > cap(file.name)) throw new Error(`A history file exceeds the ${cap(file.name) / 1024 / 1024} MB per-file limit.`);
      await consume(strFromU8(new Uint8Array(await file.arrayBuffer())), file.name);
    }
  }
  if (!entries) throw new Error("Choose Spotify's Extended Streaming History ZIP or its audio JSON files, or Apple's \"Apple Music Play Activity.csv\" (or the Apple Media Services ZIP it is in).");
  if (!total) throw new Error("These files contain no valid plays.");
  return total;
}
