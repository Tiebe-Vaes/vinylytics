"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { backupDb, deleteDb, restoreDb } from "@/browser/db";

/** Browser build settings: the history lives in this browser, so it is yours to back up, move or delete. */
export default function BrowserSettings() {
  const restoreInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Whether the browser promised not to evict this site's storage (navigator.storage.persist()).
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(false));
  }, []);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  const backup = () => run("Saving backup…", async () => {
    const blob = await backupDb();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `vinylytics-backup-${new Date().toISOString().slice(0, 10)}.tar.gz` });
    a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
  });

  const restore = (file: File | undefined) => file && run("Restoring…", async () => {
    if (!window.confirm("Replace the history in this browser with this backup? What is here now is deleted.")) return setBusy(null);
    await restoreDb(file);
    window.location.reload();
  });

  const remove = () => run("Deleting…", async () => {
    if (!window.confirm("Delete your whole listening history from this browser? This cannot be undone. Save a backup first if you want to keep it.")) return setBusy(null);
    await deleteDb();
    window.location.reload();
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" description="Your history lives only in this browser. Back it up to keep it or move it to another device." />
      <Panel title="Import">
        <p className="text-sm text-muted-text">Add a newer Spotify export. Plays you already have are skipped.</p>
        <Link href="/settings/import" className="mt-3 inline-block text-sm font-semibold underline">Import history</Link>
      </Panel>
      <Panel title="Your data">
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy !== null} onClick={backup} className="min-h-11">Save backup</Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => restoreInput.current?.click()} className="min-h-11">Restore backup</Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={remove} className="min-h-11 text-bad">Delete my data</Button>
        </div>
        <input ref={restoreInput} type="file" accept=".gz,.tar.gz,application/gzip" className="sr-only" tabIndex={-1} aria-label="Backup file"
          onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ""; }} />
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-muted-text">{error ? <span role="alert" className="text-bad">{error}</span> : busy}</p>
        <p className="mt-2 text-sm text-muted-text">
          {persisted === true
            ? "This browser keeps your history until you delete it or clear this site's data."
            : persisted === false
              ? "This browser may clear your history when it runs low on space or after weeks without a visit. Save a backup to be safe."
              : null}
        </p>
      </Panel>
    </div>
  );
}
