import { hasDb } from "@/db";

export { timezone } from "./tz";

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Sample data and no sign-in: development only, never in production. */
export function demoAllowed(): boolean {
  if (isProd()) return false;
  return !hasDb() || process.env.DEMO_MODE === "1";
}

/** `npm run local`: one person's copy on this computer, no sign-in. Never in production: Host is client-controlled. */
export function localOnly(): boolean {
  return !isProd() && process.env.VINYLYTICS_LOCAL === "1";
}

/** Local mode trusts only requests addressed to this machine, which also blocks DNS rebinding. */
export function isLoopbackHost(host: string | null): boolean {
  const name = host?.replace(/:\d+$/, "");
  return name === "127.0.0.1" || name === "localhost" || name === "[::1]";
}

/** A mismatched Origin is never legitimate for state-changing routes. */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // curl and GitHub Actions send no Origin

  const host = req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
