/**
 * Absolute URL for a redirect inside the app. Behind Docker or a proxy,
 * `req.url` can name the wrong host (localhost instead of 127.0.0.1), and the
 * session cookie would then be set on one host and looked for on another.
 * SPOTIFY_REDIRECT_URI is the app's real address by definition, so use its origin.
 */
export function appUrl(path: string, redirectUri: string | undefined, fallback: string): URL {
  try {
    if (redirectUri) return new URL(path, new URL(redirectUri).origin);
  } catch {
    // fall through to the request URL
  }
  return new URL(path, fallback);
}
