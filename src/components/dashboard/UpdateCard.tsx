import { FiaTranslationNote } from '../fia/FiaTranslationNote'
import type { PublishedUpdate } from '../../services/fia/published-dataset'
import type { TechnicalUpdate } from '../../features/technical-preview/data'
import { type Locale, technicalText, uiText } from '../../i18n'

export function UpdateCard({ update, locale, fiaRecord }: { update: TechnicalUpdate; locale: Locale; fiaRecord?: PublishedUpdate }) {
  return <article className="update-card">
    <div className="update-card__top"><span>{update.team}</span><span className={`status status--${update.status.toLowerCase().replace(' ', '-')}`}>{technicalText(locale, update.status)}</span></div>
    <h3>{update.component}</h3>{fiaRecord && <FiaTranslationNote record={fiaRecord} locale={locale} />}<p>{update.objective}</p>
    <dl><div><dt>{uiText(locale, 'magnitude')}</dt><dd>{update.magnitude}</dd></div><div><dt>{uiText(locale, 'source')}</dt><dd>{update.source}</dd></div></dl>
    <div className="confidence"><span>{uiText(locale, 'confidence')}</span><div><i style={{ width: `${update.confidence}%` }} /></div><b>{update.confidence}%</b></div>
  </article>
}
