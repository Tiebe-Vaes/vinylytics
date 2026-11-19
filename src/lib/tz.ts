// No imports: time.ts uses this from client components too.

/**
 * IANA timezone for day and hour buckets, from TIMEZONE (default UTC).
 * Validated here so a typo fails with a clear message, not mid-query.
 */
export function timezone(): string {
  // The browser build buckets days in the visitor's own zone.
  const tz = process.env.NEXT_PUBLIC_BROWSER_MODE
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : process.env.TIMEZONE || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    throw new Error(`Invalid TIMEZONE "${tz}": use an IANA name like Europe/Brussels`);
  }
  return tz;
}
