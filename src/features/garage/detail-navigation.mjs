/** Reveal only within the inspector; never move the page or focus the car. */
export function revealUpdateDetail(container, updateId, reducedMotion = false) {
  if (!container || !updateId) return false
  const detail = [...container.querySelectorAll('[data-update-id]')].find(node => node.dataset.updateId === updateId)
  const target = detail?.closest('.showroom-component')?.querySelector('.showroom-piece')
  if (!target) return false
  const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8
  container.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' })
  return true
}
