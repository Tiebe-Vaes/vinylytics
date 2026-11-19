// Files dropped on the site's get-started page (vinylytics-site
// app/get-started/drop-zone.tsx) wait in this IndexedDB store; /app?import=1
// takes them out once and imports them. Same origin, so both pages can read it.
const DB = "vinylytics-handoff";
const STORE = "files";

/** The handed-over files, removed from the store. Empty when there are none. */
export function takeHandoff(): Promise<File[]> {
  return new Promise((resolve) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => resolve([]);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const get = store.get("pending");
      store.delete("pending");
      tx.oncomplete = () => { open.result.close(); resolve((get.result as File[] | undefined) ?? []); };
      tx.onerror = () => resolve([]);
    };
  });
}
