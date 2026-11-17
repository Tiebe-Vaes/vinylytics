import { getEras } from "./eras-data";
import { cachedInsights } from "./insights";

/**
 * Recomputes the slow cached views after a sync or import, in after(), so the
 * next page load reads the cache instead of scanning the whole history.
 * Never throws: a failed warm-up only means the next page computes it.
 */
export async function warmCaches(): Promise<void> {
  const results = await Promise.allSettled([getEras(), cachedInsights()]);
  for (const r of results) if (r.status === "rejected") console.error("[warm-caches]", r.reason);
}
