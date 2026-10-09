export function canRenderAd(c, p, consentGranted, scriptReady, width) {
return c.enabled === true && c.provider === 'adsense' && c.siteApproved === true
&& c.rightsReviewed === true && c.privacyReady === true && c.consentReady === true
&& /^ca-pub-\d{16}$/.test(c.publisherId ?? '') && c.placements.includes(p)
&& /^\d+$/.test(c.slots?.[p] ?? '') && consentGranted === true && scriptReady === true && width >= 300
}
