export type AppSection = 'preview' | 'teams' | 'updates' | 'garage' | 'circuits'

const navigationLabels = {
  es: { teams: 'EQUIPOS', updates: 'ACTUALIZACIONES', circuits: 'CIRCUITOS' },
  en: { teams: 'TEAMS', updates: 'UPDATES', circuits: 'CIRCUITS' },
  it: { teams: 'TEAM', updates: 'AGGIORNAMENTI', circuits: 'CIRCUITI' },
  pt: { teams: 'EQUIPES', updates: 'ATUALIZAÇÕES', circuits: 'CIRCUITOS' },
  fr: { teams: 'ÉQUIPES', updates: 'MISES À JOUR', circuits: 'CIRCUITS' },
  de: { teams: 'TEAMS', updates: 'UPDATES', circuits: 'STRECKEN' },
} as const
export const navigationItems = (locale: keyof typeof navigationLabels): { id: AppSection; label: string }[] => [
  { id: 'garage', label: 'F1 TECH' }, { id: 'preview', label: 'TECHNICAL PREVIEW' }, { id: 'teams', label: navigationLabels[locale].teams }, { id: 'updates', label: navigationLabels[locale].updates }, { id: 'circuits', label: navigationLabels[locale].circuits },
]
