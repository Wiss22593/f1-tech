import adConfig from '../../config/ads.json'

export type AdPlacement = 'technical-preview-inline' | 'updates-bottom' | 'teams-bottom' | 'circuits-bottom'

/** Structural hook only. It renders nothing until provider, consent and IDs are configured. */
export function AdSlot({ placementId }: { placementId: AdPlacement }) {
  if (!adConfig.enabled || !adConfig.provider || !adConfig.placements.includes(placementId)) return null
  return <aside data-ad-placement={placementId} aria-hidden="true" />
}
