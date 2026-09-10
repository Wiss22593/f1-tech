import { type Locale, uiText } from '../../i18n'
type DevelopmentRankingProps = { teams: { team: string; updates: number }[]; locale: Locale; demo?: boolean }

export function DevelopmentRanking({ teams, locale, demo = false }: DevelopmentRankingProps) {
  const ranked = [...teams].sort((a, b) => b.updates - a.updates).slice(0, 5)
  return <section className="development-ranking card"><div><p className="section-kicker">{uiText(locale, 'developmentRanking')}</p><h2>{uiText(locale, 'developmentActivity')}</h2></div><ol>{ranked.map((team, index) => <li key={team.team}><span>{String(index + 1).padStart(2, '0')}</span><b>{team.team}</b><i /><strong>{team.updates} {demo && <em>{uiText(locale, 'demo')}</em>}</strong></li>)}</ol></section>
}
