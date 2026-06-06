// Service Worker for GleeWorld PWA
// Version: 12.0 - May 2026 - Radio.co purge + role redirect refactor.
// Bump forces any browser holding the v11 bundle (which still imported the
// deleted radio hooks) to flush and load the new index-*.js.
const CACHE_VERSION = 'v33.8';
const CACHE_NAME = `gleeworld-${CACHE_VERSION}`;
const STATIC_CACHE = `gleeworld-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `gleeworld-dynamic-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/lovable-uploads/gleeworld-logo.png',
  '/offline.html'
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/dashboard',
  '/messenger',
  '/events',
  '/handbook'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v7.0...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v7.0...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete any cache that doesn't match current version
              return name.startsWith('gleeworld-') && !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - network first with cache fallback for HTML, network first for JS/CSS, cache for images/fonts
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // CRITICAL: Skip audio/video streaming requests - NEVER cache or intercept these
  // This prevents PWA service worker from interfering with radio and notification playback
  if (request.destination === 'audio' || request.destination === 'video') {
    console.log('[SW] Skipping audio/video request:', url.href);
    return;
  }

  // Skip Radio.co streaming URLs - these must go directly to network
  if (url.hostname.includes('radio.co') || 
      url.hostname.includes('streaming.radio.co') ||
      url.hostname.includes('s2.radio.co') ||
      url.hostname.includes('s3.radio.co') ||
      url.hostname.includes('s4.radio.co') ||
      url.hostname.includes('s5.radio.co')) {
    console.log('[SW] Skipping radio stream request:', url.href);
    return;
  }

  // Skip any URL with /listen path (audio streams)
  if (url.pathname.includes('/listen')) {
    console.log('[SW] Skipping stream URL:', url.href);
    return;
  }

  // Skip notification-sounds bucket URLs (Supabase storage audio files)
  if (url.pathname.includes('notification-sounds') || 
      url.pathname.includes('/storage/') && (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav') || url.pathname.endsWith('.ogg'))) {
    console.log('[SW] Skipping notification sound request:', url.href);
    return;
  }

  // Skip any audio file extensions
  if (url.pathname.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
    console.log('[SW] Skipping audio file request:', url.href);
    return;
  }

  // Skip Supabase API calls - always fetch from network
  if (url.hostname.includes('supabase')) return;

  // Skip external APIs
  if (!url.hostname.includes('lovableproject.com') && 
      !url.hostname.includes('localhost') &&
      !url.hostname.includes('gleeworld')) return;

  // IMPORTANT: avoid caching Vite dev/prebundle chunks (can cause React to be served stale)
  // Example path in Lovable preview: /node_modules/.vite/deps/chunk-XXXX.js
  if (url.pathname.includes('/node_modules/.vite/')) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests (HTML pages) - network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              return caches.match('/offline.html') || caches.match('/');
            });
        })
    );
    return;
  }

  // JS/CSS: network-first (prevents stale React bundles causing invalid hook calls)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images/fonts: cache-first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'GleeWorld',
    body: 'You have a new notification',
    icon: '/lovable-uploads/gleeworld-logo.png',
    badge: '/lovable-uploads/gleeworld-logo.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ],
    tag: 'gleeworld-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Placeholder for syncing offline messages when back online
  console.log('[SW] Syncing pending messages...');
}

// Message handling from client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
