/** Reveal only within the inspector; never move the page or focus the car. */
export function revealUpdateDetail(container, updateId, reducedMotion = false) {
  if (!container || !updateId) return false
  const target = [...container.querySelectorAll('[data-update-id]')].find(node => node.dataset.updateId === updateId)
  if (!target) return false
  const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8
  container.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' })
  target.focus({ preventScroll: true })
  return true
}
