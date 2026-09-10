import { SectionHeading } from './SectionHeading'
import { type Locale, uiText } from '../../i18n'

type TeamBattleProps = { teams: readonly { team: string; updates: number }[]; locale: Locale }

export function TeamBattle({ teams, locale }: TeamBattleProps) {
  return <section className="dashboard-section"><SectionHeading title={uiText(locale, 'developmentBattle')} eyebrow={uiText(locale, 'developmentOverview')} />
    <div className="team-grid">{teams.map(({ team, updates }, index) => <article className="team-card" key={team}>
      <span className="team-card__number">{String(index + 1).padStart(2, '0')}</span><strong>{team}</strong><div><b>{updates}</b><span> {uiText(locale, 'updates')}</span></div>
    </article>)}</div>
  </section>
}
