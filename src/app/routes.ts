import type { AppSection } from './navigation'

const sectionPaths: Record<AppSection, string> = {
  garage: '/inicio', preview: '/technical-preview', teams: '/equipos', updates: '/actualizaciones', circuits: '/circuitos',
}

const pathSections: Record<string, AppSection> = {
  '/': 'garage', '/inicio': 'garage', '/garage': 'garage', '/technical-preview': 'preview', '/equipos': 'teams', '/actualizaciones': 'updates', '/circuitos': 'circuits',
}

export const sectionFromLocation = (pathname = window.location.pathname): AppSection => pathSections[pathname] ?? 'garage'
export const pathForSection = (section: AppSection) => sectionPaths[section]

export function navigateToSection(section: AppSection) {
  const destination = pathForSection(section)
  if (window.location.pathname !== destination) window.history.pushState({}, '', destination)
}
