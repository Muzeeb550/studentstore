// ✅ MINIMAL Service Worker for PWA Install Prompt
const CACHE_NAME = 'studentstore-v1';

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests (no caching interference)
  event.respondWith(fetch(event.request));
});
