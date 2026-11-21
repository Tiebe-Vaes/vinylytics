"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shares a link that carries your top artists; the friend's own app compares it with theirs. */
export function CompareLink({ code, label = "Compare with a friend" }: { code: string; label?: string }) {
  const [done, setDone] = useState<string | null>(null);
  async function share() {
    const url = new URL(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/compare?with=${code}`, window.location.origin).toString();
    try {
      if (navigator.share) { await navigator.share({ title: "Compare our music", url }); setDone("Shared"); return; }
      await navigator.clipboard.writeText(url);
      setDone("Link copied");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setDone("Couldn’t share the link");
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <Button variant="outline" className="min-h-11" onClick={() => void share()}><Users aria-hidden="true" />{label}</Button>
      <span role="status" className="text-sm text-muted-text">{done}</span>
    </span>
  );
}
