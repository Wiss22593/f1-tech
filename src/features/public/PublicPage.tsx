import type { Locale } from '../../i18n'
import { publicText } from '../../i18n/public-pages'
export type PublicSection = 'about' | 'privacy' | 'contact'
export function PublicPage({ section, locale }: { section: PublicSection; locale: Locale }) {
const c = publicText(locale)
return <section className="public-page dashboard__content" aria-labelledby="public-title"><h1 id="public-title">{c[section]}</h1>{c.body[section].map((p,i)=><p key={i}>{p}</p>)}{section==='privacy'&&<p><a href="https://policies.google.com/privacy">Google</a> · <a href="https://www.netlify.com/privacy/">Netlify</a> · <a href="https://cafecito.app/">Cafecito</a></p>}</section>
}
