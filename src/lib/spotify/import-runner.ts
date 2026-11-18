"use client";

import { useSyncExternalStore } from "react";
import { clearQueue, readBatch, readJob, saveJob, type ImportJob } from "./import-store";
import type { PrepareStage } from "./import-prepare";

/**
 * One import per browser profile. A worker stages sanitised PlayWire batches in
 * IndexedDB, then this module uploads them with the server's acknowledged
 * offset as the cursor, so a lost response, reload or closed tab resumes from
 * the last saved batch. A Web Lock keeps a second tab from uploading at once;
 * the server cursor would reject or replay its batches anyway.
 */
export type ImportState =
  | { status: "idle" }
  | { status: "preparing"; phase: PrepareStage; count: number }
  | { status: "uploading"; saved: number; total: number }
  | { status: "paused"; saved: number; total: number; error?: string }
  | { status: "elsewhere" }
  | { status: "done"; total: number; written: number }
  | { status: "cancelled"; saved: number }
  | { status: "error"; message: string };

const IDLE: ImportState = { status: "idle" };
const LOCK = "vinylytics-import";
const RETRIES = 3;

let state: ImportState = IDLE;
const listeners = new Set<() => void>();
function set(next: ImportState) {
  state = next;
  for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const useImport = () => useSyncExternalStore(subscribe, () => state, () => IDLE);

let running = false;
let abort: AbortController | undefined;
let stopping: "pause" | "cancel" | undefined;
let job: ImportJob | undefined;

export const isBusy = (s: ImportState) => s.status === "preparing" || s.status === "uploading";

function reason(err: unknown) {
  if (err instanceof DOMException && err.name === "QuotaExceededError") {
    return "Browser storage is full. Free some space or choose fewer history files.";
  }
  if (err instanceof DOMException && (err.name === "InvalidStateError" || err.name === "SecurityError")) {
    return "This browser blocks the storage the import needs. Leave private browsing and try again.";
  }
  return err instanceof Error ? err.message : "Could not read the export.";
}

/** Runs `task` while holding the cross-tab lock. Another tab's import shows as
 * "elsewhere" and this tab picks up its queue once that tab lets go. */
async function exclusive(task: () => Promise<void>) {
  if (running) return;
  const guarded = async () => {
    running = true;
    stopping = undefined;
    abort = new AbortController();
    try {
      await task();
    } catch (err) {
      if (!abort.signal.aborted) set({ status: "error", message: reason(err) });
    } finally {
      running = false;
      if (stopping === "cancel") {
        await clearQueue().catch(() => {});
        set({ status: "cancelled", saved: job?.saved ?? 0 });
        job = undefined;
      } else if (stopping === "pause" && job) {
        set({ status: "paused", saved: job.saved, total: job.total });
      }
    }
  };
  if (!navigator.locks) return guarded();
  await navigator.locks.request(LOCK, { ifAvailable: true }, async (lock) => {
    if (lock) return guarded();
    set({ status: "elsewhere" });
    void navigator.locks.request(LOCK, async () => {}).then(() => resumeImport());
  });
}

function prepare(files: File[], signal: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    const worker = new Worker(new URL("./import-worker.ts", import.meta.url), { type: "module" });
    const stop = () => { worker.terminate(); reject(new DOMException("Import cancelled", "AbortError")); };
    signal.addEventListener("abort", stop, { once: true });
    worker.onmessage = ({ data }: MessageEvent<{ phase?: PrepareStage; count?: number; total?: number; error?: string }>) => {
      if (data.phase) return set({ status: "preparing", phase: data.phase, count: data.count ?? 0 });
      signal.removeEventListener("abort", stop);
      worker.terminate();
      if (data.error) reject(new Error(data.error));
      else resolve(data.total ?? 0);
    };
    worker.onerror = (event) => {
      signal.removeEventListener("abort", stop);
      worker.terminate();
      reject(new Error(event.message || "Could not read the export."));
    };
    worker.postMessage(files);
  });
}

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
});

async function upload(current: ImportJob, signal: AbortSignal) {
  job = current;
  let failures = 0;
  set({ status: "uploading", saved: current.saved, total: current.total });
  while (current.saved < current.total) {
    const offset = current.saved;
    const plays = await readBatch(offset);
    if (!plays) {
      await clearQueue();
      job = undefined;
      return set({ status: "error", message: "The staged import is incomplete. Choose the export again; saved plays are kept." });
    }
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plays, batchId: current.id, offset, final: offset + plays.length >= current.total }),
      signal,
    }).catch(() => null);
    if (signal.aborted) return;
    if (res?.ok) {
      const receipt = (await res.json()) as { saved: number; written: number };
      current.saved = receipt.saved;
      current.written = receipt.written;
      await saveJob(current);
      failures = 0;
      set({ status: "uploading", saved: current.saved, total: current.total });
      continue;
    }
    if (res?.status === 401) {
      return set({ status: "paused", saved: offset, total: current.total, error: "Your session ended. Sign in again; the import resumes where it stopped." });
    }
    if (res && res.status >= 400 && res.status < 500 && res.status !== 429) {
      // 400 or 409: the server cannot continue this run, so the queue is useless.
      await clearQueue();
      job = undefined;
      return set({ status: "error", message: "The server rejected this import. Choose the export again; saved plays are kept." });
    }
    if (++failures >= RETRIES) {
      return set({ status: "paused", saved: offset, total: current.total, error: "Upload failed. Progress is kept; resume when the connection is back." });
    }
    await wait(1000 * 2 ** failures, signal);
    if (signal.aborted) return;
  }
  await clearQueue();
  job = undefined;
  set({ status: "done", total: current.total, written: current.written });
}

export function startImport(files: File[]) {
  if (!files.length || isBusy(state)) return Promise.resolve();
  return exclusive(async () => {
    const signal = abort!.signal;
    const next: ImportJob = { id: crypto.randomUUID(), total: 0, saved: 0, written: 0 };
    job = next;
    set({ status: "preparing", phase: "reading", count: 0 });
    try {
      await clearQueue();
      await saveJob(next);
      next.total = await prepare(files, signal);
      await saveJob(next);
    } catch (err) {
      if (signal.aborted) return;
      job = undefined;
      await clearQueue().catch(() => {});
      throw err;
    }
    await upload(next, signal);
  });
}

/** Picks up a staged queue after a reload, a closed tab or a pause. */
export function resumeImport() {
  return exclusive(async () => {
    const saved = await readJob().catch(() => undefined);
    if (!saved) {
      if (state.status === "elsewhere") set(IDLE);
      return;
    }
    if (!saved.total) {
      await clearQueue();
      return set({ status: "error", message: "Preparing the export was interrupted. Choose the files again." });
    }
    await upload(saved, abort!.signal);
  });
}

export function pauseImport() {
  if (state.status !== "uploading") return;
  stopping = "pause";
  abort?.abort();
}

export function cancelImport() {
  if (running) {
    stopping = "cancel";
    abort?.abort();
    return;
  }
  void clearQueue().catch(() => {});
  set({ status: "cancelled", saved: job?.saved ?? (state.status === "paused" ? state.saved : 0) });
  job = undefined;
}

export function dismissImport() {
  if (!isBusy(state) && state.status !== "paused" && state.status !== "elsewhere") set(IDLE);
}

const n = (value: number) => value.toLocaleString("en-GB");

/** Shared copy for the import page and the app-wide status dock. */
export function describeImport(s: ImportState): { title: string; detail: string; fraction: number | null } {
  switch (s.status) {
    case "preparing":
      return {
        title: s.phase === "unpacking" ? "Unpacking the archive" : s.phase === "reading" ? "Reading files" : `Preparing ${n(s.count)} plays`,
        detail: "Keep this tab open until preparation finishes. Uploading continues after a reload.",
        fraction: null,
      };
    case "uploading":
      return { title: `Saving ${n(s.saved)} of ${n(s.total)} plays`, detail: "You can keep browsing. Closing the tab pauses the upload; it resumes when you return.", fraction: s.saved / s.total };
    case "paused":
      return { title: `Paused at ${n(s.saved)} of ${n(s.total)} plays`, detail: s.error ?? "Progress is kept in this browser.", fraction: s.saved / s.total };
    case "elsewhere":
      return { title: "Import running in another tab", detail: "This tab takes over if that tab closes.", fraction: null };
    case "done":
      return { title: `Saved ${n(s.total)} plays, ${n(s.written)} new`, detail: "Artwork and genres fill in in the background. Re-importing is safe; stored plays are skipped.", fraction: 1 };
    case "cancelled":
      return { title: "Import cancelled", detail: s.saved ? `${n(s.saved)} plays were already saved and stay in your history.` : "Nothing was saved.", fraction: null };
    case "error":
      return { title: "Import failed", detail: s.message, fraction: null };
    default:
      return { title: "", detail: "", fraction: null };
  }
}
