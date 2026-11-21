"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/panel";
import { describeImport, isBusy, startImport, useImport } from "@/lib/spotify/import-runner";
import { cn } from "@/lib/utils";
import { ImportControls, ImportSpinner } from "./import-controls";

const BADGE = {
  done: ["Saved", "bg-good/10 text-good"],
  error: ["Failed", "bg-bad/10 text-bad"],
  paused: ["Paused", "bg-muted text-muted-foreground"],
  cancelled: ["Cancelled", "bg-muted text-muted-foreground"],
} as const;

/** Drop zone for Spotify's Extended Streaming History. Progress lives in the
 * shared import runner, so it survives navigation and resumes after a reload. */
export function SpotifyImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const state = useImport();
  const busy = isBusy(state) || state.status === "paused" || state.status === "elsewhere";
  const { title, detail, fraction } = describeImport(state);
  const badge = state.status in BADGE ? BADGE[state.status as keyof typeof BADGE] : null;

  const handle = (files: File[]) => { if (!busy) void startImport(files); };

  return (
    <div className="flex flex-col gap-6">
      <Card
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-dashed border-strong px-6 py-14 text-center transition-colors",
          dragging && "border-brand bg-text-wash"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle([...(e.dataTransfer.files ?? [])]);
        }}
      >
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <Upload className="size-5" aria-hidden />
        </span>
        <h2 className="mt-5 text-base font-semibold">Drop your listening history here</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The Extended Streaming History <span className="nums">.zip</span>, or its{" "}
          <span className="nums">Streaming_History_Audio_*.json</span> files from Spotify, or{" "}
          <span className="nums">Apple Music Play Activity.csv</span> from Apple. It is read in your browser;{" "}
          {process.env.NEXT_PUBLIC_BROWSER_MODE
            ? "nothing leaves it."
            : "only the plays themselves are uploaded, never your IP, country or device."}
        </p>
        <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-6">
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,.json,.csv"
          className="hidden"
          onChange={(e) => {
            handle([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </Card>

      {state.status !== "idle" && (
        <Card role={state.status === "error" ? "alert" : "status"} className="flex flex-col gap-3 px-0 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <ImportSpinner state={state} />
            {badge && (
              <Badge variant="outline" className={cn("border-transparent", badge[1])}>
                {badge[0]}
              </Badge>
            )}
            <h2 className="nums text-base font-semibold">{title}</h2>
          </div>
          {fraction != null && <Progress value={Math.round(fraction * 100)} aria-label="Import progress" className="max-w-sm" />}
          <p className="text-sm text-muted-foreground">{detail}</p>
          <ImportControls state={state} />
        </Card>
      )}
    </div>
  );
}
