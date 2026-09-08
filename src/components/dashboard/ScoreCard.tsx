type ScoreCardProps = { label: string; value: number }

export function ScoreCard({ label, value }: ScoreCardProps) {
  return <article className="score-card"><div className="score-card__ring" style={{ '--score': `${value * 3.6}deg` } as React.CSSProperties}><span>{value}</span></div><h3>{label}</h3><p>ÍNDICE DEMO</p></article>
}
