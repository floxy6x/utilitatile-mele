const CACHE_NAME = 'indexuri-app-v1.2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalare Service Worker și caching-ul fișierelor
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Cached all files successfully');
        return self.skipWaiting();
      })
      .catch(err => {
        console.log('Service Worker: Error caching files', err);
      })
  );
});

// Activare Service Worker și curățarea cache-urilor vechi
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim();
    })
  );
});

// Interceptare cereri și servire din cache
self.addEventListener('fetch', event => {
  // Doar pentru cereri GET și din același domeniu
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Returnează din cache dacă există
          if (response) {
            console.log('Service Worker: Serving from cache', event.request.url);
            return response;
          }
          
          // Altfel, încearcă să facă cererea la server
          console.log('Service Worker: Fetching from network', event.request.url);
          return fetch(event.request)
            .then(response => {
              // Verifică dacă răspunsul este valid
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonează răspunsul pentru cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(err => {
              console.log('Service Worker: Network request failed', err);
              
              // Dacă cererea a eșuat și e pentru pagina principală, returnează index.html din cache
              if (event.request.destination === 'document') {
                return caches.match('./index.html');
              }
              
              // Pentru alte tipuri de fișiere, returnează o eroare sau un placeholder
              return new Response('Aplicația funcționează offline. Această resursă nu este disponibilă.', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Gestionare mesaje de la aplicația principală
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Funcție pentru notificări push (pentru viitor)
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Reminder: Verificați indexurile!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Deschide App',
        icon: './icon-192.png'
      },
      {
        action: 'close',
        title: 'Închide'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Indexuri & Reminder-uri', options)
  );
});

// Gestionare click pe notificări
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Deschide aplicația
    event.waitUntil(
      clients.openWindow('./')
    );
  } else if (event.action === 'close') {
    // Nu face nimic, notificarea se închide automat
    console.log('Service Worker: Notification closed');
  } else {
    // Click pe notificare (nu pe acțiuni)
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Sincronizare în background (pentru viitor)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // Aici poți adăuga logica pentru sincronizarea datelor
      doBackgroundSync()
    );
  }
});

// Funcție helper pentru sincronizare
function doBackgroundSync() {
  return new Promise((resolve, reject) => {
    console.log('Service Worker: Performing background sync...');
    // Aici vei putea adăuga logica pentru sincronizarea cu un server
    // Pentru moment, doar simulăm o operație
    setTimeout(() => {
      console.log('Service Worker: Background sync completed');
      resolve();
    }, 1000);
  });
}
