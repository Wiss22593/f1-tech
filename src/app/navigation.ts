export type AppSection = 'preview' | 'teams' | 'updates' | 'garage' | 'circuits'

export const navigationItems: { id: AppSection; label: string }[] = [
  { id: 'preview', label: 'TECHNICAL PREVIEW' }, { id: 'teams', label: 'EQUIPOS' }, { id: 'updates', label: 'ACTUALIZACIONES' }, { id: 'garage', label: '3D GARAGE' }, { id: 'circuits', label: 'CIRCUITOS' },
]
