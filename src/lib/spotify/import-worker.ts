import { prepareImport } from "./import-prepare";
import { stageBatch } from "./import-store";

self.onmessage = async (event: MessageEvent<File[]>) => {
  try {
    const total = await prepareImport(event.data, stageBatch, (phase, count) => self.postMessage({ phase, count }));
    self.postMessage({ total });
  } catch (err) {
    const message = err instanceof DOMException && err.name === "QuotaExceededError"
      ? "Browser storage is full. Free some space or choose fewer history files."
      : err instanceof Error ? err.message : "Could not read the export.";
    self.postMessage({ error: message });
  }
};
