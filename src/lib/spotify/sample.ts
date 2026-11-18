import { hasDb } from "@/db";
import { demoAllowed } from "@/lib/env";
import type { NowPlaying } from "./types";

/* Demo-mode data for screenshots. Invented titles: no real listening data. */

/**
 * Sample music only when there is no database at all (dev-demo screenshots).
 * dev:local has a local DB, so it shows what was actually imported there.
 */
export function musicSampleMode(): boolean {
  return demoAllowed() && !hasDb();
}

export const sampleNowPlaying: NowPlaying = {
  kind: "track",
  title: "Northern Lights Drive",
  subtitle: "The Paper Coast",
  imageUrl: null,
  url: null,
  progressMs: 94_000,
  durationMs: 231_000,
  isPlaying: true,
};
