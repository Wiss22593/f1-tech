import type { Locale } from '../../i18n'

type WordmarkProps = { compact?: boolean; locale?: Locale }
const homeLabels: Record<Locale, string> = { es: 'inicio', en: 'home', it: 'home page', pt: 'início', fr: 'accueil', de: 'Startseite' }

export function Wordmark({ compact = false, locale = 'es' }: WordmarkProps) {
  return (
    <a className="wordmark" href="/inicio" aria-label={`F1 TECH, ${homeLabels[locale]}`}>
      <span className="wordmark__mark" aria-hidden="true">F1</span>
      {!compact && <span>TECH</span>}
    </a>
  )
}
