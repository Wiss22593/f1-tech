import type { Team } from '../../features/teams/data'
import { type Locale, technicalText, uiText } from '../../i18n'

type TeamCardProps = { team: Team; index: number; onSelect: (team: Team) => void; locale: Locale }

export function TeamCard({ team, index, onSelect, locale }: TeamCardProps) {
  const updateCount = team.publishedUpdates ?? team.demoUpdates
  const isPublished = team.publishedUpdates !== undefined
  return <button className="team-profile-card card" onClick={() => onSelect(team)}>
    <span className="team-profile-card__number">{String(index + 1).padStart(2, '0')}</span>
    <span className="team-profile-card__season">{uiText(locale, 'season')} {team.season}</span>
    <h2>{team.name}</h2><p className="team-profile-card__car">{team.carName ?? uiText(locale, 'carPending')}</p>
    <div className="team-profile-card__metrics"><div><span>{uiText(locale, 'updatesLabel')}</span><b>{updateCount}{!isPublished && <em> {uiText(locale, 'demo')}</em>}</b></div><div><span>F1 TECH SCORE</span><b>{team.demoScore}<em> {uiText(locale, 'demo')}</em></b></div></div>
    <div className="team-profile-card__status"><span>{technicalText(locale, team.demoDevelopmentStatus)}</span><b>{uiText(locale, 'viewProfile')} <i>→</i></b></div>
  </button>
}
