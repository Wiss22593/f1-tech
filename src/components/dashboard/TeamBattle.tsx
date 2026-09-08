import type { demoTeams } from '../../features/technical-preview/data'
import { SectionHeading } from './SectionHeading'

type TeamBattleProps = { teams: typeof demoTeams }

export function TeamBattle({ teams }: TeamBattleProps) {
  return <section className="dashboard-section"><SectionHeading title="Development Battle" eyebrow="PANORAMA DE ACTUALIZACIONES" />
    <div className="team-grid">{teams.map(({ team, updates }, index) => <article className="team-card" key={team}>
      <span className="team-card__number">{String(index + 1).padStart(2, '0')}</span><strong>{team}</strong><div><b>{updates}</b><span> ACTUALIZACIONES</span></div>
    </article>)}</div>
  </section>
}
