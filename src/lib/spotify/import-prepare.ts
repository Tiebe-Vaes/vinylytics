import { strFromU8, Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { isExportAudioFile, parseExportFile } from "./export";
import type { PlayWire } from "./types";

const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const CHUNK = 1000;

export type PrepareStage = "reading" | "unpacking" | "preparing";

/** Stream ZIP input and discard unrelated members. Only one audio file and a
 * bounded decompression window are in memory between writes to IndexedDB. */
async function unpack(file: File, consume: (text: string) => Promise<void>) {
  const ready: Uint8Array[][] = [];
  const archive = new Unzip((entry: UnzipFile) => {
    if (!isExportAudioFile(entry.name)) return;
    let bytes = 0;
    const parts: Uint8Array[] = [];
    entry.ondata = (err, data, final) => {
      if (err) throw err;
      bytes += data.length;
      if (bytes > MAX_ENTRY_BYTES) throw new Error("A history file exceeds the 64 MB per-file limit.");
      parts.push(data);
      if (final) ready.push(parts);
    };
    entry.start();
  });
  archive.register(UnzipInflate);
  // Slice input deliberately: a browser stream may yield an entire large Blob.
  for (let i = 0; i < file.size; i += 32_768) {
    const end = Math.min(i + 32_768, file.size);
    archive.push(new Uint8Array(await file.slice(i, end).arrayBuffer()), end === file.size);
    for (const parts of ready.splice(0)) {
      const decoder = new TextDecoder();
      await consume(parts.map(part => decoder.decode(part, { stream: true })).join("") + decoder.decode());
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
  async function consume(text: string) {
    entries++;
    progress("preparing", total);
    let json: unknown;
    try { json = JSON.parse(text); }
    catch { throw new Error("A history file contains invalid JSON. Choose a fresh copy of the export."); }
    const plays = parseExportFile(json);
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
    } else if (isExportAudioFile(file.name)) {
      progress("reading", total);
      if (file.size > MAX_ENTRY_BYTES) throw new Error("A history file exceeds the 64 MB per-file limit.");
      await consume(strFromU8(new Uint8Array(await file.arrayBuffer())));
    }
  }
  if (!entries) throw new Error("Choose the Extended Streaming History ZIP or its audio history JSON files.");
  if (!total) throw new Error("These files contain no valid plays.");
  return total;
}
