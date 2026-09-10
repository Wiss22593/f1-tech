# Monetization readiness

Status: architecture only; all advertising and tracking are disabled.

Web placement hooks exist for `technical-preview-inline`, `updates-bottom`, `teams-bottom` and `circuits-bottom`. They render nothing while `src/config/ads.json` has `enabled: false`, a null provider and no IDs. Garage deliberately has no placement.

The current public origin is `https://formulatech.netlify.app`. Before activation, the owner must obtain provider account/site approval for that origin (or a future verified custom domain), provide unit IDs, publish a privacy/cookie policy, define consent requirements by region and withdrawal controls, and document storage/network calls. Analytics and ad scripts must not load before the applicable consent decision. Sponsor and affiliate placements need visible disclosure and must stay distinguishable from FIA facts and F1 TECH analysis.

Mobile plans use an equivalent native abstraction after Capacitor QA. Banner/native units belong on secondary screens; no ad may cover the car, components or navigation. Avoid repetitive interstitials. Rewarded ads are limited to optional future extras, never access to the core technical-update dataset.
