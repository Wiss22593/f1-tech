import { type Locale, uiText } from '../../i18n'
export function PredictionPanel({ locale }: { locale: Locale }) {
  return <section className="prediction-panel card"><div><p className="section-kicker">{uiText(locale, 'preRacePrediction')}</p><h2>{uiText(locale, 'predictionPreparing')}</h2><p>{uiText(locale, 'predictionText')}</p></div><div><span>{uiText(locale, 'resultVsPrediction')}</span><strong>—</strong><b>{uiText(locale, 'noResults')}</b></div></section>
}
