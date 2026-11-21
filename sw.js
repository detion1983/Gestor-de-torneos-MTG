/*
 * sw.js
 * Service worker de la PWA de DCI Reporter.
 *
 * - Guarda la "shell" de la app (HTML, CSS, JS, manifest e iconos) para que
 *   se pueda abrir desde la pantalla de inicio incluso sin cobertura.
 * - Las páginas se piden primero a la red: cuando hay conexión siempre se ve
 *   la última versión publicada; sin conexión se usa la copia guardada.
 * - El resto de recursos propios se sirven de caché y se refrescan en segundo
 *   plano (stale-while-revalidate).
 * - Si la app ya estaba abierta, la versión nueva espera a que el usuario pulse
 *   "Actualizar" en el aviso de js/pwa-update.js; así no se mezclan HTML, CSS y
 *   JS de dos versiones en la misma pestaña.
 *
 * CACHE_VERSION se sube junto con APP_VERSION con tools/bump-version.py.
 */

const CACHE_VERSION = 'v2.4.5';
const CACHE_NAME = 'dci-reporter-' + CACHE_VERSION;

// Recursos imprescindibles: si falta uno, la app no podría abrirse offline.
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/storage.js',
    './js/swiss.js',
    './js/art.js',
    './js/share.js',
    './js/timer.js',
    './js/table.js',
    './js/app.js',
    './js/install.js',
    './js/pwa-update.js',
    './assets/images/icons/icon-192.png',
    './assets/images/icons/icon-512.png',
    './assets/images/icons/icon-maskable-512.png',
    './assets/images/icons/apple-touch-icon.png',
];

// Arte opcional: se cachea si existe, pero un 404 no cancela la instalación
// del service worker (el banner y las ilustraciones son adornos).
const EXTRA_ASSETS = [
    './assets/images/logo.jpg',
    './assets/images/favicon.png',
    './assets/images/favicon.ico',
    './assets/images/banner.jpg',
    './assets/images/colors/w.jpeg',
    './assets/images/colors/u.jpeg',
    './assets/images/colors/b.jpeg',
    './assets/images/colors/r.jpeg',
    './assets/images/colors/g.jpeg',
    './assets/images/colors/c.jpeg',
    './assets/images/symbols/w.svg',
    './assets/images/symbols/u.svg',
    './assets/images/symbols/b.svg',
    './assets/images/symbols/r.svg',
    './assets/images/symbols/g.svg',
    './assets/images/symbols/c.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        await Promise.all(EXTRA_ASSETS.map((url) => cache.add(url).catch(() => null)));
        // La versión nueva queda en espera si la app ya estaba abierta;
        // pwa-update.js muestra el aviso y envía SKIP_WAITING al pulsar.
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter((key) => key.startsWith('dci-reporter-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        // Solo se guardan respuestas completas: una 206 (Range, p. ej. audio)
        // no sirve como copia de respaldo.
        if (response && response.status === 200) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const fallback = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (fallback) return fallback;
        return new Response('Sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    const network = fetch(request)
        .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);

    if (cached) {
        network.catch(() => {});
        return cached;
    }

    const fresh = await network;
    if (fresh) return fresh;
    return new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});
