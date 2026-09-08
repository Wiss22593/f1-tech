import type { Team } from '../../features/teams/data'

type TeamCardProps = { team: Team; index: number; onSelect: (team: Team) => void }

export function TeamCard({ team, index, onSelect }: TeamCardProps) {
  return <button className="team-profile-card card" onClick={() => onSelect(team)}>
    <span className="team-profile-card__number">{String(index + 1).padStart(2, '0')}</span>
    <span className="team-profile-card__season">TEMPORADA {team.season}</span>
    <h2>{team.name}</h2><p className="team-profile-card__car">{team.carName ?? 'COCHE · PENDIENTE DE DEFINIR'}</p>
    <div className="team-profile-card__metrics"><div><span>ACTUALIZACIONES</span><b>{team.demoUpdates}<em> DEMO</em></b></div><div><span>F1 TECH SCORE</span><b>{team.demoScore}<em> DEMO</em></b></div></div>
    <div className="team-profile-card__status"><span>{team.demoDevelopmentStatus}</span><b>VER PERFIL <i>→</i></b></div>
  </button>
}
