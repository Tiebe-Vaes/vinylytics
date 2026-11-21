/**
 * "Compare with a friend" without accounts: your year's top artists travel in
 * the link itself, as a URL-safe code. Nothing is stored anywhere; the friend's
 * app compares the code with its own history.
 */
const MAX_ARTISTS = 15;
const MAX_NAME = 100;

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (code: string) => Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function encodeTaste(year: number, artists: string[]): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify({ v: 1, y: year, a: artists })));
}

/** The code's year and artists, or null for anything malformed. The code comes from a link, so trust nothing in it. */
export function decodeTaste(code: string): { year: number; artists: string[] } | null {
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(code)));
    if (!data || typeof data !== "object") return null;
    const { v, y, a } = data as Record<string, unknown>;
    if (v !== 1 || !Number.isInteger(y) || (y as number) < 2008 || (y as number) > 2100 || !Array.isArray(a)) return null;
    if (!a.every((name) => typeof name === "string")) return null;
    const artists = (a as string[]).map((name) => name.trim().slice(0, MAX_NAME)).filter(Boolean).slice(0, MAX_ARTISTS);
    return artists.length ? { year: y as number, artists } : null;
  } catch {
    return null;
  }
}

/** Shared artists (in your order), and a match score: shared out of the longer list. Names match case-insensitively. */
export function compareTaste(mine: string[], theirs: string[]) {
  const key = (name: string) => name.trim().toLowerCase();
  const theirKeys = new Set(theirs.map(key));
  const myKeys = new Set(mine.map(key));
  const shared = mine.filter((name) => theirKeys.has(key(name)));
  const longest = Math.max(mine.length, theirs.length);
  return {
    match: longest ? Math.round((100 * shared.length) / longest) : 0,
    shared,
    onlyMine: mine.filter((name) => !theirKeys.has(key(name))),
    onlyTheirs: theirs.filter((name) => !myKeys.has(key(name))),
  };
}
