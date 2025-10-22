// ✅ SAFE Service Worker for StudentStore PWA
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
  const { request } = event;
  const url = new URL(request.url);

  // 🔥 FIX #1: Skip all navigation requests (page loads)
  if (request.mode === 'navigate') {
    console.log('🔀 Navigation request, skipping SW:', url.pathname);
    return; // Let browser handle normally
  }

  // 🔥 FIX #2: Skip authentication routes completely
  if (url.pathname.includes('/auth/')) {
    console.log('🔐 Auth route detected, skipping SW:', url.pathname);
    return;
  }

  // 🔥 FIX #3: Skip API requests (let them always go to network)
  if (url.pathname.startsWith('/api/')) {
    console.log('📡 API request, skipping SW:', url.pathname);
    return;
  }

  // 🔥 FIX #4: Skip external requests (Google OAuth, ImageKit, etc.)
  if (url.origin !== location.origin) {
    console.log('🌐 External request, skipping SW:', url.origin);
    return;
  }

  // ✅ Handle all other requests (static assets like CSS, JS, images)
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful responses
        if (response && response.status === 200) {
          console.log('✅ Fetched successfully:', url.pathname);
        }
        return response;
      })
      .catch(error => {
        console.error('❌ Fetch failed for:', url.pathname, error);
        // Return a basic offline response if needed
        return new Response('Offline - Please check your connection', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
