import { type Locale, uiText } from '../../i18n'
type ScoreCardProps = { label: string; value: number; locale: Locale }

export function ScoreCard({ label, value, locale }: ScoreCardProps) {
  return <article className="score-card"><div className="score-card__ring" style={{ '--score': `${value * 3.6}deg` } as React.CSSProperties}><span>{value}</span></div><h3>{label}</h3><p>{uiText(locale, 'demoIndex')}</p></article>
}
