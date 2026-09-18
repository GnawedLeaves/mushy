// Minimal, hand-rolled service worker (no next-pwa/Workbox -- that plugin's
// webpack-only build isn't Turbopack-compatible yet, and switching this
// whole app's dev/build to --webpack just for this one feature was a bigger
// trade than writing ~30 lines by hand). Its only job is to exist with a
// `fetch` listener, which is what Chrome's installability check actually
// requires for the "Add to Home Screen" prompt on Android.
//
// It deliberately does NOT cache pages, API routes, or Supabase signed
// media URLs -- those are all short-lived/dynamic (signed URLs expire),
// so caching them would serve stale or broken content. Only the static
// app-icon assets are cached.
const CACHE_NAME = "mushy-static-v1";
const PRECACHE_URLS = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
