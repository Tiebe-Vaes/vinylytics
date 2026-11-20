"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Chrome's install prompt, kept from page load so Settings can offer it later. */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPrompt; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

/** Registers the service worker once (production only: it would cache dev builds). */
export function RegisterServiceWorker() {
  useEffect(() => {
    // Chrome grants persistence to installed apps on request; a refusal changes nothing.
    void navigator.storage?.persist?.().catch(() => false);
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => {});
  }, []);
  return null;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** "installed" when opened as the installed app, "prompt" when Chrome can install it now, else "manual". */
export function useInstallState(): "installed" | "prompt" | "manual" {
  return useSyncExternalStore(subscribe,
    () => (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone ? "installed" : deferred ? "prompt" : "manual"),
    () => "manual");
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  notify();
}
