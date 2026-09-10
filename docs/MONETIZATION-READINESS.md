# Monetization readiness

Status: architecture only; all advertising and tracking are disabled.

Web placement hooks exist for `technical-preview-inline`, `updates-bottom`, `teams-bottom` and `circuits-bottom`. They render nothing while `src/config/ads.json` has `enabled: false`, a null provider and no IDs. Garage deliberately has no placement.

Before activation, the owner must provide a production domain, provider account/site approval, unit IDs, public privacy/cookie policy, consent requirements by region, withdrawal controls and a documented inventory of storage/network calls. Analytics and ad scripts must not load before the applicable consent decision. Sponsor and affiliate placements need visible disclosure and must stay distinguishable from FIA facts and F1 TECH analysis.

Mobile plans use an equivalent native abstraction after Capacitor QA. Banner/native units belong on secondary screens; no ad may cover the car, components or navigation. Avoid repetitive interstitials. Rewarded ads are limited to optional future extras, never access to the core technical-update dataset.
