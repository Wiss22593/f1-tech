const CACHE = 'f1-tech-shell-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest']
const BGRT_MODEL = '/models/bgrt-f1-concept-2026.glb'

const cacheIfSuccessful = async (request, response) => {
  if (response?.ok) await caches.open(CACHE).then((cache) => cache.put(request, response.clone()))
  return response
}

const networkFirst = async (request) => {
  try { return await cacheIfSuccessful(request, await fetch(request)) } catch { return (await caches.match(request)) ?? Response.error() }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  const url = new URL(event.request.url)
  // Published JSON prefers freshness and retains only the last successful response offline.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(event.request))
    return
  }
  // The sole 3D asset has an explicit cache policy; unrelated responses are never cached blindly.
  if (url.pathname === BGRT_MODEL) {
    event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => cacheIfSuccessful(event.request, response))))
    return
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => cacheIfSuccessful(event.request, response)).catch(() => caches.match('/index.html')))
    return
  }
  if (['script', 'style', 'font', 'image'].includes(event.request.destination)) {
    event.respondWith(caches.match(event.request).then((cached) => {
      const refresh = fetch(event.request).then((response) => cacheIfSuccessful(event.request, response)).catch(() => cached)
      return cached ?? refresh
    }))
  }
})
