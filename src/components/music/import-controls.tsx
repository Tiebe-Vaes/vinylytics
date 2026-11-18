"use client";

import { Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelImport, dismissImport, isBusy, pauseImport, resumeImport, type ImportState } from "@/lib/spotify/import-runner";

/** A record turning while the import works; still under reduced motion. */
export function ImportSpinner({ state }: { state: ImportState }) {
  if (!isBusy(state)) return null;
  return <Disc3 aria-hidden className="size-5 shrink-0 text-brand animate-[spin_2.4s_linear_infinite] motion-reduce:animate-none" />;
}

/** Pause, resume, cancel and dismiss for the current import state. */
export function ImportControls({ state }: { state: ImportState }) {
  const s = state.status;
  return (
    <div className="flex flex-wrap gap-2">
      {s === "uploading" && <Button type="button" size="sm" variant="outline" onClick={pauseImport}>Pause</Button>}
      {s === "paused" && <Button type="button" size="sm" onClick={() => void resumeImport()}>Resume</Button>}
      {(s === "preparing" || s === "uploading" || s === "paused") && (
        <Button type="button" size="sm" variant="ghost" onClick={cancelImport}>Cancel</Button>
      )}
      {(s === "done" || s === "cancelled" || s === "error") && (
        <Button type="button" size="sm" variant="ghost" onClick={dismissImport}>Dismiss</Button>
      )}
    </div>
  );
}
