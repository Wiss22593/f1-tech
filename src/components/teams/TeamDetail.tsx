import type { Team } from '../../features/teams/data'

type TeamDetailProps = { team: Team; onBack: () => void }

const futureAreas = [
  ['01', 'Coche 3D', 'Visor interactivo y zonas técnicas.'], ['02', 'Pilotos', 'Perfiles cuando haya datos disponibles.'], ['03', 'Actualizaciones', 'Historial técnico verificado.'], ['04', 'Evolución', 'Cronología del coche durante la temporada.'], ['05', 'Componentes', 'Mapa de piezas y objetivos.'], ['06', 'Circuit Fit', 'Relación entre trazado y paquete técnico.'],
]

export function TeamDetail({ team, onBack }: TeamDetailProps) {
  return <section className="team-detail dashboard__content" aria-labelledby="team-title">
    <button className="back-button" onClick={onBack}>← VOLVER A EQUIPOS</button>
    <div className="team-detail__hero"><div><p className="section-kicker">PERFIL TÉCNICO · ENTORNO DEMO</p><h1 id="team-title">{team.name}<span>.</span></h1><p>TEMPORADA {team.season} <i>·</i> {team.carName ?? 'NOMBRE DEL COCHE PENDIENTE DE DEFINIR'}</p></div><div className="team-detail__score"><span>F1 TECH SCORE</span><strong>{team.demoScore}</strong><b>DEMO</b></div></div>
    <p className="demo-notice"><b>DEMO</b>Las métricas y el estado de este perfil son demostrativos. No representan datos técnicos, deportivos ni de desarrollo reales.</p>
    <section className="team-detail__summary card"><div><span>ACTUALIZACIONES</span><strong>{team.demoUpdates} <em>DEMO</em></strong></div><div><span>ESTADO DE DESARROLLO</span><strong>{team.demoDevelopmentStatus} <em>DEMO</em></strong></div><div><span>COCHE 2026</span><strong>{team.carName ?? 'POR DEFINIR'}</strong></div></section>
    <section><div className="section-heading"><div><p className="section-kicker">ARQUITECTURA DEL PERFIL</p><h2>Próximas capas de análisis</h2></div></div><div className="team-detail__areas">{futureAreas.map(([number, title, description]) => <article className="card" key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p><b>PRÓXIMAMENTE</b></article>)}</div></section>
  </section>
}
