/** A localhost session must never reuse production shell modules across Vite revisions. */
export async function prepareDevelopmentSession({ navigator, caches, location } = globalThis) {
  if (!navigator?.serviceWorker) return true
  const ownWorker = worker => worker && new URL(worker.scriptURL).origin === location.origin
    && new URL(worker.scriptURL).pathname === '/sw.js'
  const registrations = await navigator.serviceWorker.getRegistrations()
  const ownRegistrations = registrations.filter(registration =>
    [registration.active, registration.waiting, registration.installing].some(ownWorker))
  const controlled = ownWorker(navigator.serviceWorker.controller)
  if (!ownRegistrations.length && !controlled) return true
  await Promise.all(ownRegistrations.map(registration => registration.unregister()))
  if (caches) {
    const names = await caches.keys()
    await Promise.all(names.filter(name => name.startsWith('f1-tech-shell-')).map(name => caches.delete(name)))
  }
  // Unregister does not release an already controlled document. Reload once,
  // after clearing our cache, so every imported module comes from this checkout.
  if (controlled) { location.reload(); return false }
  return true
}
