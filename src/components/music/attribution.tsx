/** Spotify's terms ask for attribution wherever its data shows. Text only, no logo. */
export function SpotifyAttribution() {
  return (
    <p className="text-xs text-faint">
      Data from{" "}
      <a
        href="https://open.spotify.com"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        Spotify
      </a>
    </p>
  );
}
