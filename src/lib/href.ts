/**
 * Links to detail pages. The browser build is a static export, which cannot
 * hold a page per artist or track, so there the id travels in the query string.
 */
const browser = Boolean(process.env.NEXT_PUBLIC_BROWSER_MODE);

export const artistHref = (name: string) =>
  browser ? `/artist?name=${encodeURIComponent(name)}` : `/artist/${encodeURIComponent(name)}`;

/** `id` is the bare Spotify track id or a full `spotify:track:` URI. */
export const trackHref = (id: string) => {
  const bare = id.split(":").at(-1)!;
  return browser ? `/track?id=${encodeURIComponent(bare)}` : `/track/${encodeURIComponent(bare)}`;
};

export const albumHref = (id: string) =>
  browser ? `/album?id=${encodeURIComponent(id)}` : `/album/${encodeURIComponent(id)}`;

export const eraHref = (id: string) => (browser ? `/eras?id=${id}` : `/eras/${id}`);
