import type { PublishedUpdate } from '../../services/fia/published-dataset'
import type { Locale } from '../../i18n'
/**
 * FIA translation provenance and expandable source copy stay in the dataset,
 * but are intentionally not rendered inside update cards.
 */
export function FiaTranslationNote(_props: { record: PublishedUpdate; locale: Locale }) {
  return null
}
