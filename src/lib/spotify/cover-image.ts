const MAX_BYTES = 2 * 1024 * 1024;

/** Spotify cover bytes only: bounded while streaming, with no redirects to other hosts. */
export async function fetchCover(url: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "i.scdn.co" || parsed.port || parsed.username || parsed.password) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "error" });
    const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim().toLowerCase();
    if (!res.ok || !res.body || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type) || Number(res.headers.get("content-length")) > MAX_BYTES) {
      await res.body?.cancel();
      return null;
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return size ? { data: Buffer.concat(chunks, size), type } : null;
  } catch {
    return null;
  }
}
