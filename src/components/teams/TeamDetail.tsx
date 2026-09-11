import type { Team } from '../../features/teams/data'
import { dataStateText, type Locale, technicalText, uiText } from '../../i18n'
import type { PublishedUpdate } from '../../services/fia/published-dataset'
import { grandsPrix2026 } from '../../data/grands-prix/2026'

type TeamDetailProps = { team: Team; updates: PublishedUpdate[]; onBack: () => void; locale: Locale }

const futureAreas = [
  ['01', 'Coche 3D', 'Visor interactivo y zonas técnicas.'], ['02', 'Pilotos', 'Perfiles cuando haya datos disponibles.'], ['03', 'Actualizaciones', 'Historial técnico verificado.'], ['04', 'Evolución', 'Cronología del coche durante la temporada.'], ['05', 'Componentes', 'Mapa de piezas y objetivos.'], ['06', 'Circuit Fit', 'Relación entre trazado y paquete técnico.'],
]

export function TeamDetail({ team, updates, onBack, locale }: TeamDetailProps) {
  const updateCount = team.publishedUpdates ?? team.demoUpdates
  const isPublished = team.publishedUpdates !== undefined
  return <section className="team-detail dashboard__content" aria-labelledby="team-title">
    <button className="back-button" onClick={onBack}>← {uiText(locale, 'backTeams')}</button>
    <div className="team-detail__hero"><div><p className="section-kicker">{uiText(locale, 'technicalProfile')}</p><h1 id="team-title">{team.name}<span>.</span></h1><p>{uiText(locale, 'season')} {team.season} <i>·</i> {team.carName ?? uiText(locale, 'carNamePending')}</p></div><div className="team-detail__score"><span>F1 TECH SCORE</span><strong>{team.demoScore}</strong><b>{uiText(locale, 'demo')}</b></div></div>
    <p className="demo-notice"><b>{uiText(locale, 'demo')}</b>{uiText(locale, 'profileDemo')}</p>
    <section className="team-detail__summary card"><div><span>{uiText(locale, 'updatesLabel')}</span><strong>{updateCount} {!isPublished && <em>{uiText(locale, 'demo')}</em>}</strong></div><div><span>{uiText(locale, 'developmentStatus')}</span><strong>{technicalText(locale, team.demoDevelopmentStatus)} <em>{uiText(locale, 'demo')}</em></strong></div><div><span>{uiText(locale, 'car2026')}</span><strong>{team.carName ?? uiText(locale, 'toDefine')}</strong></div></section>
    <section className="dashboard-section"><div className="section-heading"><div><p className="section-kicker">{dataStateText(locale, 'history')}</p><h2>{uiText(locale, 'updatesTitle')}</h2></div></div>{updates.length === 0 ? <p className="demo-notice">{dataStateText(locale, 'noHistory')}</p> : <div className="updates-grid">{updates.map((update) => <article className="card" key={update.id}><span className="section-kicker">{grandsPrix2026.find((grandPrix) => grandPrix.id === update.grandPrixId)?.name ?? update.grandPrixId}</span><h3>{update.componentName ?? update.componentId}</h3><p>{update.sourceText}</p><b>{technicalText(locale, update.technicalState)}</b></article>)}</div>}</section>
    <section><div className="section-heading"><div><p className="section-kicker">{uiText(locale, 'profileArchitecture')}</p><h2>{uiText(locale, 'nextLayers')}</h2></div></div><div className="team-detail__areas">{futureAreas.map(([number, title, description]) => <article className="card" key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p><b>{uiText(locale, 'threeSoon')}</b></article>)}</div></section>
  </section>
}
