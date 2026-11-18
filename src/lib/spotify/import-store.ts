import type { PlayWire } from "./types";

/** total stays 0 until the worker has staged every batch. */
export type ImportJob = { id: string; total: number; saved: number; written: number };

let connection: Promise<IDBDatabase> | undefined;
function open() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("vinylytics-import", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("job");
      request.result.createObjectStore("batches");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { connection = undefined; reject(request.error); };
  });
  return connection;
}

async function read<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const database = await open();
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function write(update: (tx: IDBTransaction) => void) {
  const database = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(["job", "batches"], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Browser storage interrupted the import."));
    update(tx);
  });
}

export const readJob = () => read<ImportJob>("job", "active");
export const readBatch = (offset: number) => read<PlayWire[]>("batches", offset);
export const stageBatch = (offset: number, batch: PlayWire[]) =>
  write(tx => { tx.objectStore("batches").put(batch, offset); });
/** Drops every staged batch below job.saved: the server may acknowledge past
 * the batch just sent when another tab already uploaded it. */
export const saveJob = (job: ImportJob) => write(tx => {
  tx.objectStore("job").put(job, "active");
  if (job.saved > 0) tx.objectStore("batches").delete(IDBKeyRange.upperBound(job.saved, true));
});
export const clearQueue = () => write(tx => {
  tx.objectStore("batches").clear();
  tx.objectStore("job").clear();
});
