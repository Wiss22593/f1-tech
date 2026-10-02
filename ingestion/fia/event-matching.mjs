/** Explicit identities only; venue aliases belong exclusively to this 2026 event. */
const key = value => (value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const aliases = ['Bahrain Grand Prix', 'Bahrain Grand Prix in Malaysia', 'Malaysia', 'Sepang'].map(key)
export function matchesEventName(event, candidate) {
  if (key(event.eventName) === key(candidate)) return true
  return (event.id ?? event.grandPrixId) === 'bahrain-2026' && event.season === 2026 && key(event.eventName) === key('Bahrain Grand Prix') && aliases.includes(key(candidate))
}
