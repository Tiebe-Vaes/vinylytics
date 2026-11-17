/** Response shapes from the Spotify Web API, trimmed to the fields we read. */

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
};

export type SpotifyImage = { url: string; width: number | null; height: number | null };

export type SpotifyArtistRef = { name: string; id: string | null };

export type SpotifyTrack = {
  type: "track";
  name: string;
  duration_ms: number;
  uri: string;
  external_urls: { spotify?: string };
  artists: SpotifyArtistRef[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    total_tracks: number;
    release_date: string;
    artists: SpotifyArtistRef[];
  };
};

export type SpotifyEpisode = {
  type: "episode";
  name: string;
  duration_ms: number;
  uri: string;
  external_urls: { spotify?: string };
  images: SpotifyImage[];
  show: { name: string };
};

export type CurrentlyPlayingResponse = {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  item: SpotifyTrack | SpotifyEpisode | null;
};

export type NowPlaying = {
  kind: "track" | "episode";
  title: string;
  subtitle: string;
  imageUrl: string | null;
  url: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
};

/** One play as stored in `plays`, from the export or the API. */
export type PlayRow = {
  playedAt: Date;
  msPlayed: number;
  kind: "track" | "episode" | "audiobook";
  uri: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  reasonStart: string | null;
  reasonEnd: string | null;
  skipped: boolean | null;
  shuffle: boolean | null;
  source: "export" | "api";
};

/** `PlayRow` as JSON for uploads. */
export type PlayWire = Omit<PlayRow, "playedAt"> & { playedAt: string };

export type RecentlyPlayedItem = { played_at: string; track: SpotifyTrack };
export type RecentlyPlayedResponse = { items: RecentlyPlayedItem[] };

/** null = all time. `to` is exclusive. */
export type Range = { from: Date; to: Date } | null;

export type SpotifyArtist = {
  id: string;
  name: string;
  images: SpotifyImage[];
  external_urls: { spotify?: string };
};

export type TopItem = {
  name: string;
  subtitle: string;
  imageUrl: string | null;
  url: string | null;
  minutes?: number;
  streams?: number;
};
