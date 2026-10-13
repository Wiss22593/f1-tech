import { insightText } from '../../features/insights/copy'
import type { Locale } from '../../i18n'
import { publicText } from '../../i18n/public-pages'
export function InformationLinks({ locale }: { locale: Locale }) {
const c = publicText(locale)
return <>{[['/actualizaciones',c.updates],['/equipos',c.teams],['/pilotos',insightText(locale,'drivers')],['/circuitos',c.circuits],['/technical-preview',c.preview],['/acerca-de',c.about],['/privacidad',c.privacy],['/contacto',c.contact]].map(([path,label])=><a key={path} href={path}>{label}</a>)}</>
}
export function InformationMenu({ locale }: { locale: Locale }) {
return <details className="header-information" onKeyDown={(event) => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}><summary aria-label={publicText(locale).information}><span aria-hidden="true">⋯</span></summary><nav aria-label={publicText(locale).information}><InformationLinks locale={locale} /></nav></details>
}


