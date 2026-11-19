"use client";

import { ImportDock } from "@/components/music/import-dock";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";
import { ToastProvider } from "@/components/toaster";
import { DbGate } from "@/browser/db-gate";

/** Browser build shell: no sign-in, the history lives in this browser. */
export default function BrowserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TopBar />
      {/* pb clears the phone tab bar (h-16) plus the home indicator. */}
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-16"><DbGate>{children}</DbGate></main>
      <ImportDock />
      <TabBar />
    </ToastProvider>
  );
}
