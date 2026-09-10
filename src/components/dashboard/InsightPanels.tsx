import { SectionHeading } from './SectionHeading'
import { type Locale, uiText } from '../../i18n'

export function InsightPanels({ locale }: { locale: Locale }) {
  return <section className="insight-grid">
    <article className="card circuit-fit"><SectionHeading title={uiText(locale, 'circuitFit')} eyebrow={uiText(locale, 'circuitReading')} /><div className="fit-meter"><span style={{ width: '78%' }} /><i /></div><div className="fit-labels"><span>{uiText(locale, 'aeroEfficiency')}</span><b>78 / 100</b></div><p>{locale === 'es' ? 'Referencia visual demostrativa para conectar más adelante características del circuito y rendimiento técnico.' : 'Demonstrative visual reference for linking circuit characteristics and technical performance later.'}</p></article>
    <article className="card changed"><SectionHeading title={uiText(locale, 'changed')} eyebrow={uiText(locale, 'technicalSummary')} /><ul><li><span>01</span>{locale === 'es' ? 'Nuevo foco en carga de baja altura.' : 'New focus on low-ride-height load.'}</li><li><span>02</span>{locale === 'es' ? 'Iteraciones de balance delantero.' : 'Front-balance iterations.'}</li><li><span>03</span>{locale === 'es' ? 'Evaluación térmica en curso.' : 'Thermal evaluation in progress.'}</li></ul></article>
  </section>
}
