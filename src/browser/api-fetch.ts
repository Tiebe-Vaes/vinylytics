// Browser build only: stands in for `@/lib/api-fetch`. There is no server, so
// the request goes straight to the route handler, which reads the local database.
import { openDb } from "./db";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, window.location.origin);
  const [{ ROUTES }] = await Promise.all([import("./local-routes"), openDb()]);
  for (const [pattern, handler] of ROUTES) {
    const match = url.pathname.match(pattern);
    if (!match) continue;
    init?.signal?.throwIfAborted();
    // Only the era card has a route param: /api/card/era/[id].
    const params: Record<string, string> = match[1] ? { id: decodeURIComponent(match[1]) } : {};
    return handler(new Request(url, { signal: init?.signal ?? undefined }), { params: Promise.resolve(params) });
  }
  return new Response("Not found", { status: 404 });
}
