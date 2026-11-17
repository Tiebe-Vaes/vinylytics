"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { ImportProgress } from "@/lib/spotify/import-client";
import { importSpotifyFiles } from "@/lib/spotify/import-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/panel";
import { cn } from "@/lib/utils";

type Result = Awaited<ReturnType<typeof importSpotifyFiles>>;
const fmt = (n: number) => n.toLocaleString("en-GB");

/** Drop zone for Spotify's Extended Streaming History. Same shape as the health import. */
export function SpotifyImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = progress != null && progress.phase !== "done" && progress.phase !== "error";

  async function handle(files: File[]) {
    if (files.length === 0 || busy) return;
    setError(null);
    setResult(null);
    try {
      setResult(await importSpotifyFiles(files, setProgress));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress({ phase: "error", message: "Import failed", fraction: null });
    }
  }

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
          void handle([...(e.dataTransfer.files ?? [])]);
        }}
      >
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
          <Upload className="size-5" aria-hidden />
        </span>
        <h2 className="mt-5 text-base font-semibold">
          {busy ? progress?.message : "Drop your Spotify listening history here"}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The Extended Streaming History <span className="nums">.zip</span>, or its{" "}
          <span className="nums">Streaming_History_Audio_*.json</span> files. It is read in your browser; only
          the plays themselves are uploaded, never your IP, country or device.
        </p>
        {busy && progress?.fraction != null && (
          <Progress value={Math.round(progress.fraction * 100)} className="mt-6 w-full max-w-sm" />
        )}
        <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-6">
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,.json"
          className="hidden"
          onChange={(e) => {
            void handle([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </Card>

      {error && (
        <Card role="alert" className="flex flex-col gap-2 px-0 py-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="border-transparent bg-bad/10 text-bad">
              Failed
            </Badge>
            <h2 className="text-base font-semibold">Import failed</h2>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      )}

      {result && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-0 py-4">
            <Badge variant="outline" className="border-transparent bg-good/10 text-good">
              Success
            </Badge>
            <h2 className="nums text-base font-semibold">
              {fmt(result.plays)} plays, {fmt(result.written)} new
            </h2>
          </div>
          <p className="bg-muted/40 px-0 py-3 text-sm text-muted-foreground">
            Read {result.files} file{result.files === 1 ? "" : "s"}. Re-importing is safe: plays already stored are
            skipped.
          </p>
        </Card>
      )}
    </div>
  );
}
