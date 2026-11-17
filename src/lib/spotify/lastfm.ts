/**
 * Genres from Last.fm, because Spotify's dev mode stopped returning artist
 * genres in 2026. Last.fm tags are crowd-sourced ("seen live", "00s",
 * "female vocalists"), so only tags on a genre allow-list count.
 * Free for non-commercial use with an API key; keep under ~5 req/s.
 */

export const GENRES: ReadonlySet<string> = new Set([
  "rock", "pop", "hip-hop", "rap", "trap", "r&b", "soul", "funk", "disco", "jazz", "blues",
  "electronic", "house", "deep house", "tech house", "techno", "trance", "drum and bass",
  "dubstep", "garage", "uk garage", "ambient", "downtempo", "trip-hop", "edm", "electropop",
  "synthpop", "dance", "indie", "indie rock", "indie pop", "indie folk", "alternative",
  "alternative rock", "post-rock", "shoegaze", "dream pop", "punk", "pop punk", "post-punk",
  "emo", "hardcore", "metal", "heavy metal", "metalcore", "death metal", "black metal",
  "grunge", "hard rock", "classic rock", "psychedelic", "progressive rock", "folk", "country",
  "americana", "singer-songwriter", "acoustic", "classical", "soundtrack", "instrumental",
  "piano", "lo-fi", "reggae", "dancehall", "ska", "latin", "reggaeton", "k-pop", "j-pop",
  "afrobeats", "afrobeat", "gospel", "world", "experimental", "noise", "new wave", "grime",
  "drill", "neo-soul", "chillout", "nederpop", "hyperpop", "eurodance", "schlager",
]);

const ALIASES: Record<string, string> = {
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  rnb: "r&b",
  "rhythm and blues": "r&b",
  "dnb": "drum and bass",
  "drum n bass": "drum and bass",
  "trip hop": "trip-hop",
  "lofi": "lo-fi",
  "lo fi": "lo-fi",
  "post punk": "post-punk",
  "synth pop": "synthpop",
  "electro pop": "electropop",
};

const MIN_COUNT = 20;
const MAX_GENRES = 3;

export function pickGenres(tags: { name: string; count: number }[]): string[] {
  const picked: string[] = [];
  for (const t of [...tags].sort((a, b) => b.count - a.count)) {
    if (t.count < MIN_COUNT) break;
    const raw = t.name.trim().toLowerCase();
    const name = ALIASES[raw] ?? raw;
    if (GENRES.has(name) && !picked.includes(name)) picked.push(name);
    if (picked.length === MAX_GENRES) break;
  }
  return picked;
}

type TopTagsResponse = { toptags?: { tag?: { name: string; count: number | string }[] } };

export async function getTopTags(artist: string): Promise<{ name: string; count: number }[]> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) return [];

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.search = new URLSearchParams({
    method: "artist.gettoptags",
    artist,
    api_key: key,
    format: "json",
    autocorrect: "1",
  }).toString();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Tieboard/1.0 (personal dashboard)" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as TopTagsResponse;
    return (json.toptags?.tag ?? []).map((t) => ({ name: t.name, count: Number(t.count) || 0 }));
  } catch {
    return [];
  }
}
