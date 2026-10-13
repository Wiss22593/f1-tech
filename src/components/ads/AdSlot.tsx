import { useEffect, useRef, useState } from 'react'
import adConfig from '../../config/ads.json'
import { canRenderAd } from './ad-readiness.mjs'
import { publicText } from '../../i18n/public-pages'
import type { Locale } from '../../i18n'
export type AdPlacement = 'technical-preview-inline' | 'updates-bottom' | 'teams-bottom' | 'circuits-bottom'
type Props = { placementId: AdPlacement; locale: Locale; consentGranted?: boolean; scriptReady?: boolean }
/** No loader: a separately authorized CMP integration must supply both runtime gates. */
export function AdSlot({ placementId, locale, consentGranted = false, scriptReady = false }: Props) {
if (!canRenderAd(adConfig, placementId, consentGranted, scriptReady, 300)) return null
return <ReadyAd placementId={placementId} locale={locale} />
}
function ReadyAd({ placementId, locale }: Pick<Props, 'placementId' | 'locale'>) {
const ref = useRef<HTMLElement>(null)
const requested = useRef(false)
const [fits, setFits] = useState(false)
useEffect(() => {
const parent = ref.current?.parentElement
if (!parent) return
const observer = new ResizeObserver(([entry]) => setFits(entry.contentRect.width >= 300))
observer.observe(parent)
return () => observer.disconnect()
}, [])
useEffect(() => {
if (!fits || requested.current) return
const queue = (window as Window & { adsbygoogle?: { push: (value: object) => unknown } }).adsbygoogle
if (!queue) return
try { queue.push({}); requested.current = true } catch { /* Isolate optional ad failures. */ }
}, [fits])
return <aside ref={ref} className={fits ? 'manual-ad' : undefined} data-ad-placement={placementId} aria-label={publicText(locale).advertisement}>
{fits && <><span>{publicText(locale).advertisement}</span><ins className="adsbygoogle" data-ad-client={adConfig.publisherId ?? undefined} data-ad-slot={adConfig.slots[placementId] ?? undefined} /></>}
</aside>
}
