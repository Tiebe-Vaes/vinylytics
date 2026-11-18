"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { describeImport, resumeImport, useImport } from "@/lib/spotify/import-runner";
import { useNotify } from "@/components/toaster";
import { ImportControls, ImportSpinner } from "./import-controls";

/** Mounted by the app layout: resumes a staged import after a reload and keeps
 * its progress visible on every page except the import page itself. */
export function ImportDock() {
  const state = useImport();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { void resumeImport(); }, []);
  const notify = useNotify();
  const written = state.status === "done" ? state.written : null;
  useEffect(() => {
    if (written === null) return;
    router.refresh();
    notify("Import finished", `${written.toLocaleString("en-GB")} new plays added.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per finished import; notify is a fresh closure each render.
  }, [written, router]);
  useEffect(() => {
    if (state.status !== "preparing") return;
    // Preparation lives in this tab's worker; uploads survive a reload, this does not.
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.status]);

  if (state.status === "idle" || pathname === "/settings/import") return null;
  const { title, detail, fraction } = describeImport(state);
  return (
    <section
      role="status"
      aria-label="Import progress"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex flex-col gap-2 border border-rule bg-ground p-3 shadow-lg md:inset-x-auto md:right-6 md:bottom-6 md:w-80"
    >
      <p className="nums flex items-center gap-2 text-sm font-semibold"><ImportSpinner state={state} />{title}</p>
      {fraction != null && <Progress value={Math.round(fraction * 100)} aria-label="Import progress" />}
      <p className="text-xs text-muted-text">{detail}</p>
      <ImportControls state={state} />
    </section>
  );
}
