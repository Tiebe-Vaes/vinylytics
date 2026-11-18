// Test-only fixtures for the recap stat groups.
export const play = (at: string, uri: string, minutes = 4, artist = "A", extra: Record<string, unknown> = {}) => ({
  playedAt: new Date(at), msPlayed: Math.round(minutes * 60_000), kind: "track", uri, trackName: `T-${uri}`, artistName: artist, source: "export", ...extra,
});
export const year2026 = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2027-01-01T00:00:00Z") };
