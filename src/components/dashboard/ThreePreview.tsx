import { type Locale, uiText } from '../../i18n'
export function ThreePreview({ locale }: { locale: Locale }) {
  return <section className="three-preview card"><div><p className="section-kicker">{uiText(locale, 'threeSoon')}</p><h2>{uiText(locale, 'threeViewer')}</h2><p>{uiText(locale, 'threeText')}</p></div><div className="three-preview__wireframe" aria-label={uiText(locale, 'threeAria')}><span /><i /><b /></div></section>
}
