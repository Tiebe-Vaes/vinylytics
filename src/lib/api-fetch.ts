/** Client calls to this app's own API (cards, search). The browser build swaps this
 * module for src/browser/api-fetch.ts, which runs the same route handlers in the tab. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, init);
}
