// Browser build only (served at /app/sw.js). Keeps the app itself on the device so
// it opens fast and offline; the listening history already lives in IndexedDB.
const CACHE = "vinylytics-app-v1";
const START = ["/app/", "/app/app.webmanifest", "/app/app-icons/icon-192.png", "/app/app-icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(START)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("vinylytics-app-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Hashed build files, the database WASM, fonts and icons never change under the same URL.
const immutable = (path) => path.startsWith("/app/_next/static/") || /\.(wasm|data|woff2?|png|svg|ico)$/.test(path);

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

// shortcut: pages and RSC payloads are cached as visited, so offline only opens pages seen before; precache the route list if that matters.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await caches.match(request)) ?? (await caches.match(request, { ignoreSearch: true }));
    if (hit) return hit;
    if (request.mode === "navigate") {
      const start = await caches.match("/app/");
      if (start) return start;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Spotify artwork and other outside hosts are left to the browser.
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/app/")) return;
  event.respondWith(immutable(url.pathname) ? cacheFirst(request) : networkFirst(request));
});
