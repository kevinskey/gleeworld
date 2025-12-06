// Service Worker for Push Notifications
// Updated: December 2024
const CACHE_NAME = 'gleeworld-v3-dec2024';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Force immediate activation
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  // Clear all old caches to prevent stale module issues
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return clients.claim(); // Take control immediately
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'New Message',
    body: 'You have a new direct message',
    icon: '/logo-192.png',
    badge: '/logo-96.png',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: 'dm-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = new URL('/dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
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

// Fetch event - NO CACHING to prevent stale module issues
self.addEventListener('fetch', (event) => {
  // Always fetch fresh for JS/TS modules and API requests
  // Only this service worker handles push notifications
  // Let the browser handle all fetch requests normally
  return;
});
