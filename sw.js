// Service worker of the web variant: keeps the shell's own files so the app also starts without a
// connection. Network first, the stored copy only as a fallback – a newly deployed shell therefore
// arrives as soon as the device is online. Interface bundles are not handled here; the loader keeps
// those in localStorage.

const CACHE = 'shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if(response.ok){
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
