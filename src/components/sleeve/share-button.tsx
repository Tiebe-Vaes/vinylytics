"use client";

import { useState } from "react";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shares a card image: the phone's share sheet with the PNG attached where the
 * browser supports sharing files, a plain download everywhere else.
 */
export function ShareButton({ href, filename, label = "Share" }: { href: string; filename: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`card ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Vinylytics" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: filename });
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // Closing the share sheet rejects with AbortError: not a failure.
      if (!(err instanceof DOMException && err.name === "AbortError")) console.error("[share]", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={share} disabled={busy}>
      <Share className="size-4" strokeWidth={1.75} />
      {busy ? "Pressing…" : label}
    </Button>
  );
}
