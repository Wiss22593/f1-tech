import { useState } from 'react'
import { TeamCard } from '../../components/teams/TeamCard'
import { TeamDetail } from '../../components/teams/TeamDetail'
import { teams, type Team } from './data'

export function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  if (selectedTeam) return <TeamDetail team={selectedTeam} onBack={() => setSelectedTeam(null)} />
  return <section className="teams-page dashboard__content" aria-labelledby="teams-title"><div className="teams-page__intro"><div><p className="section-kicker">TEMPORADA 2026 · ENTORNO DEMO</p><h1 id="teams-title">Equipos<span>.</span></h1><p>Once perfiles para centralizar el análisis de desarrollo antes de cada Gran Premio.</p></div><span>11<br /><i>ESCUDERÍAS</i></span></div>
    <p className="demo-notice"><b>DEMO</b>Las actualizaciones, puntuaciones y estados de desarrollo son demostrativos. Los nombres de los equipos se muestran como estructura de navegación; no se incluyen datos reales de 2026.</p>
    <div className="teams-page__grid">{teams.map((team, index) => <TeamCard key={team.id} team={team} index={index} onSelect={setSelectedTeam} />)}</div>
  </section>
}
