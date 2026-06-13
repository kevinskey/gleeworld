// Service Worker — self-uninstall stub.
//
// We used to ship a full offline-first PWA service worker, but it caused
// recurring "page won't load" reports from tenants stuck on stale caches.
// For a SaaS app where every deploy is meant to be picked up immediately,
// the cure was worse than the disease.
//
// This stub:
//   1. Activates immediately on install (skipWaiting).
//   2. Claims every client on activate (clients.claim).
//   3. Wipes every cache the previous SW created.
//   4. Unregisters itself — next reload, no SW at all.
//   5. Tells every controlled tab to reload, so they immediately get fresh
//      assets straight from the network.
//
// CACHE_VERSION is still bumped per commit by the bump-sw-version Vite plugin
// so browsers re-fetch this stub when a new build deploys (cache-busts the
// sw.js URL via ETag/Last-Modified). Each new deploy re-runs the uninstall.
//
// Push notifications: not handled here. The iOS Capacitor app uses native
// APN (not web-push), so removing the SW doesn't affect mobile pushes.
const CACHE_VERSION = '__GW_BUILD_VERSION__';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // Delete every cache this SW (and prior versions) may have created.
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) {
      console.warn('[sw] cache cleanup failed', e);
    }

    try {
      // Claim all clients so this stub is in control briefly, then
      // immediately tell each one to reload — they'll pick up the fresh
      // bundle straight from the network with no SW interception.
      await self.clients.claim();
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        try { c.navigate(c.url); } catch { /* no-op */ }
      }
    } catch (e) {
      console.warn('[sw] client claim/reload failed', e);
    }

    try {
      // Unregister so future navigations don't go through any SW at all.
      await self.registration.unregister();
      console.log('[sw] unregistered (was', CACHE_VERSION, ')');
    } catch (e) {
      console.warn('[sw] unregister failed', e);
    }
  })());
});

// Pass-through fetch: don't intercept anything. If a request hits this SW
// in the brief window before unregister completes, just go to network.
self.addEventListener('fetch', () => { /* no-op — let the browser handle it */ });
