import { localizeFiaUpdate } from '../../services/fia/localization.mjs'
import type { PublishedUpdate } from '../../services/fia/published-dataset'
import type { Locale } from '../../i18n'
export function FiaTranslationNote({ record, locale }: { record: PublishedUpdate; locale: Locale }) {
  const content = localizeFiaUpdate(record, locale)
  if (content.translationStatus !== 'automatic') return null
  const originals = [['Componente', record.componentName], ['Razón primaria', record.primaryReason], ['Diferencia geométrica', record.geometricDifference], ['Descripción breve', record.briefDescription]]
  return <aside aria-label="Procedencia de la traducción"><p>{content.translationNotice}</p><details><summary>Ver texto original FIA (inglés)</summary><dl>{originals.map(([label, value]) => <div key={label}><dt>{label}</dt><dd lang="en">{value}</dd></div>)}</dl><a href={record.sourceUrl + (record.sourcePage ? '#page=' + record.sourcePage : '')} target="_blank" rel="noopener noreferrer">Documento original FIA ↗</a></details></aside>
}
