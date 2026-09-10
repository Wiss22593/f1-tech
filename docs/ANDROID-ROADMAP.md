# F1 TECH Android roadmap

Status: planned after web production QA. No Android project, store credential, advertising SDK or tracking SDK is active.

## Foundation

Keep React/Vite as the single web implementation and package its production output with Capacitor. After the web release passes route, offline, PWA and device QA:

1. Install `@capacitor/core`, `@capacitor/cli` and `@capacitor/android` at reviewed versions.
2. Run `npx cap init` and set `webDir` to `dist`.
3. Suggested application ID: `app.f1tech.mobile`. The owner must confirm ownership and permanence before initialization; changing it after Play publication creates a different app.
4. Run `npm run build`, `npx cap add android`, then `npx cap sync android`.
5. Open the generated project in Android Studio and test debug builds without changing the web Garage composition.

## Release engineering

- Use semantic web versions and monotonically increasing Android `versionCode` values.
- Create the upload key and Play App Signing configuration in owner-controlled storage. Never commit keystores, passwords or service-account JSON.
- Produce an Android App Bundle (`.aab`) for Play; retain mapping/native debug symbols when applicable.
- Test on the Play internal track first, then closed/open testing as needed, and only then production.
- Validate deep links, network loss, service-worker/Capacitor behavior, back/forward navigation, status bar, safe areas and the 3D memory footprint on physical low/mid/high-tier devices.

## Play Console checklist

- Developer account and verified contact details.
- App name, short/full descriptions, category, icon, feature graphic, phone/tablet screenshots and support URL.
- Public privacy-policy URL on the current production origin (`https://formulatech.netlify.app`) or on a future verified custom domain.
- Content rating, target audience, ads declaration, Data safety form and account-deletion declaration if accounts are later introduced.
- Current target API level, 64-bit compatibility, testing requirements and any regional declarations shown by Play Console at submission time.
- License and trademark review for FIA-derived text, standings data, team identifiers and especially the BGRT model before distribution.

## Privacy and consent

The current app does not activate ads or analytics. Before adding either, inventory every SDK and data flow, publish the privacy policy, implement region-appropriate consent (including EEA/UK consent requirements), provide withdrawal controls, minimize retention and ensure the Play Data safety declaration matches runtime behavior. Do not infer consent or preload advertising identifiers.

## Future mobile monetization

Create a native abstraction parallel to the disabled web `AdSlot`: banner/native placements only on secondary pages, never over the 3D car or critical controls. Interstitials must not interrupt normal navigation; rewarded ads are reserved for genuinely optional future extras. Technical multiline updates remain free. AdMob app/unit IDs, sponsor links and affiliate disclosure stay external configuration and must never be invented.

## Go/no-go gates

Do not start store packaging until: the Netlify production origin is stable; the championship source is commercially licensed; BGRT redistribution is authorized; privacy/consent text is published; required mobile viewport and physical-device QA pass; and the owner supplies signing and Play Console access.
