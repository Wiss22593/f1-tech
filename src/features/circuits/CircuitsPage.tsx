import { demoCircuit, demoScore } from '../../data/demo/technical'
import { circuitDemoText, t, type Locale, uiText } from '../../i18n'
import { AdSlot } from '../../components/ads/AdSlot'

export function CircuitsPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const demoLabels = circuitDemoText(locale)
  const labels: Record<keyof typeof demoCircuit.demands, string> = { downforce: uiText(locale, 'downforce'), efficiency: uiText(locale, 'efficiency'), braking: uiText(locale, 'braking'), traction: uiText(locale, 'traction'), tyreManagement: uiText(locale, 'tyreManagement'), cornering: uiText(locale, 'cornering'), kerbs: uiText(locale, 'kerbs'), cooling: uiText(locale, 'cooling'), technicalComplexity: uiText(locale, 'technicalComplexity') }
  return <section className="circuits-page dashboard__content" aria-labelledby="circuits-title"><header className="circuits-page__hero"><div><p className="section-kicker">{uiText(locale, 'circuitsKicker')}</p><h1 id="circuits-title">{uiText(locale, 'circuitsTitle')}<span>.</span></h1><p>{uiText(locale, 'circuitsSubtitle')}</p></div><div className="circuit-score"><span>{uiText(locale, 'circuitFit')}</span><strong>{demoScore}</strong><b>{uiText(locale, 'ownMetric')}</b></div></header>
    <p className="demo-notice"><b>{copy.common.demo}</b>{uiText(locale, 'circuitsNotice')}</p>
    <section className="circuit-profile card"><div className="circuit-profile__heading"><p className="section-kicker">{uiText(locale, 'referenceProfile')}</p><h2>{demoLabels.name}</h2><span>{demoLabels.country} · {demoCircuit.confidence}</span></div><div className="circuit-demand-grid">{(Object.entries(demoCircuit.demands) as [keyof typeof demoCircuit.demands, number][]).map(([key, value]) => <article key={key}><div><span>{labels[key]}</span><b>{value}<em>/10</em></b></div><i><i style={{ width: `${value * 10}%` }} /></i></article>)}</div></section>
    <section className="circuit-method card"><p className="section-kicker">{uiText(locale, 'method')}</p><h2>{uiText(locale, 'methodTitle')}</h2><div><article><span>01</span><p>{uiText(locale, 'method1')}</p></article><article><span>02</span><p>{uiText(locale, 'method2')}</p></article><article><span>03</span><p>{uiText(locale, 'method3')}</p></article></div><b>{uiText(locale, 'traceable')}</b></section>
    <AdSlot placementId="circuits-bottom" />
  </section>
}
