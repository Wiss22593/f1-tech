export type AppSection = 'preview' | 'teams' | 'updates' | 'garage' | 'circuits'

const navigationLabels = {
  es: { home: 'INICIO', teams: 'EQUIPOS', updates: 'ACTUALIZACIONES', circuits: 'CIRCUITOS' },
  en: { home: 'HOME', teams: 'TEAMS', updates: 'UPDATES', circuits: 'CIRCUITS' },
  it: { home: 'HOME', teams: 'TEAM', updates: 'AGGIORNAMENTI', circuits: 'CIRCUITI' },
  pt: { home: 'INÍCIO', teams: 'EQUIPES', updates: 'ATUALIZAÇÕES', circuits: 'CIRCUITOS' },
  fr: { home: 'ACCUEIL', teams: 'ÉQUIPES', updates: 'MISES À JOUR', circuits: 'CIRCUITS' },
  de: { home: 'START', teams: 'TEAMS', updates: 'UPDATES', circuits: 'STRECKEN' },
} as const
export const navigationItems = (locale: keyof typeof navigationLabels): { id: AppSection; label: string }[] => [
  { id: 'garage', label: navigationLabels[locale].home }, { id: 'preview', label: 'TECHNICAL PREVIEW' }, { id: 'teams', label: navigationLabels[locale].teams }, { id: 'updates', label: navigationLabels[locale].updates }, { id: 'circuits', label: navigationLabels[locale].circuits },
]
