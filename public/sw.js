// Crown & Legacy — Service Worker
// Incrementar CACHE_VERSION a cada deploy manual (builds via Lovable atualizam automaticamente)
const CACHE_VERSION = '1';
const CACHE_NAME = `crown-legacy-v${CACHE_VERSION}`;

// Install — pré-cache de assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.json',
        '/images/logo-CL-Verde-dourado-Gold-claro.png',
      ])
    )
  );
  // NÃO chama self.skipWaiting() aqui — controlado via postMessage
});

// Activate — limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and Supabase/API requests
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('supabase') ||
    event.request.url.includes('/functions/') ||
    event.request.url.includes('/rest/') ||
    event.request.url.includes('/auth/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Message — controle de skipWaiting via frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
