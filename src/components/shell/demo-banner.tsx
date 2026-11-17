import { demoAllowed } from "@/lib/env";

/** Marks seed data as synthetic: shown only in local demo mode, never in production. */
export function DemoBanner() {
  if (!demoAllowed()) return null;
  return (
    <p className="border-b border-rule bg-raised px-4 py-1.5 text-center text-xs font-semibold text-muted-text">
      Demo data: a synthetic listening history, not a real person&apos;s.
    </p>
  );
}
