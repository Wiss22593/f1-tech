type DevelopmentRankingProps = { teams: { team: string; updates: number }[] }

export function DevelopmentRanking({ teams }: DevelopmentRankingProps) {
  const ranked = [...teams].sort((a, b) => b.updates - a.updates).slice(0, 5)
  return <section className="development-ranking card"><div><p className="section-kicker">RANKING DE DESARROLLO</p><h2>Actividad de desarrollo</h2></div><ol>{ranked.map((team, index) => <li key={team.team}><span>{String(index + 1).padStart(2, '0')}</span><b>{team.team}</b><i /><strong>{team.updates} <em>DEMO</em></strong></li>)}</ol></section>
}
