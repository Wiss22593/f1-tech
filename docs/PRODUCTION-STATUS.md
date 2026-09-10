# F1 TECH Production Status

Last reviewed: 2026-09-09

## 1. FIA ingestion

Status: DONE

- One Node pipeline implements finder → downloader → pdfjs extractor → parser → normalizer → validator → publication gate.
- Discovery accepts only explicit FIA `Car Presentation Submissions`; infringement, decision and generic technical documents are rejected.
- Index, PDF and per-event timeouts isolate failures. SHA-256, atomic publication, manual-review separation and non-empty guards are active.
- Same-hash retries return `UNCHANGED`: no duplicates, rewrite or `publishedAt` churn. A changed hash is processed as a new revision and reaches the public path only after the new non-empty dataset passes every publication guard.

## 2. 2026 registry and historical backfill

Status: DONE

- The single registry `data/grands-prix/2026.json` contains all 24 official calendar rounds.
- 14 FIA event indexes are verified, 13 correct documents are processed, 13 public datasets contain 170 deterministic records, and 174 entries remain in manual review.
- Madrid has a verified index and no valid document: `NO_DOCUMENT_FOUND`. Bahrain and Saudi Arabia have no verified event index. Eight future rounds remain `PENDING` in the registry and are reported as `FUTURE`.
- Detailed evidence, hashes and the recovered transient failures are in `docs/2026-INGESTION-REPORT.md`.

## 3. Madrid and future-event discovery

Status: PARTIAL

- `npm run fia:current` selects the active/nearest event from the registry, checks its official index and exits successfully when no presentation document exists.
- The read-only scheduled workflow stages validated output and reports. It can detect Madrid after FIA publishes the document and a scheduled run executes; no exact publication hour is promised.
- Remaining dependency: future FIA event index URLs cannot be registered before FIA publishes and verifies them.

## 4. Automated publication

Status: USER_ACTION_REQUIRED

- The active workflow remains repository read-only and cannot write to `main`.
- `ingestion/fia/prepare-pr.mjs` allows only registry/public dataset paths and prevents empty PRs.
- `.github/workflows/fia-data-pr.yml.disabled` is a prepared data-only PR template. It is deliberately inactive until the owner approves GitHub Actions `contents: write` and `pull-requests: write` and reviews the pinned/third-party action policy.
- Direct automatic commits to `main` are not enabled. PR publication is the recommended audited path; auto-merge can later be added without changing ingestion.

## 5. Championship

Status: USER_ACTION_REQUIRED

- `ChampionshipProvider`, driver/constructor contracts, metadata, stable team mapping and last-valid fallback are implemented independently of FIA ingestion.
- Jolpica works technically and is retained for development/tests only. A production guard blocks it by default because its CC BY-NC-SA terms are not compatible with an assumed monetized product.
- Sportmonks is the leading commercial candidate because it explicitly permits apps/websites and commercial use, but requires an account, token and paid F1 entitlement. Sportradar requires a negotiated production agreement; API-Sports does not grant competition publication/commercial rights.
- No championship dataset is exposed as production data and zero-filled DEMO values are not presented as real standings. The owner must choose/license a provider before the production adapter is completed.

## 6. Product data consistency

Status: DONE

- Garage, Technical Preview, Actualizaciones and Equipos use only `published` FIA JSON for factual records and counts.
- Development Battle counts only published records. Actualizaciones filters by GP, team, component, area and technical state. Team detail derives its FIA history from the same boundary.
- FIA facts stay separate from visibly labelled F1 TECH DEMO analysis fields. Draft, manual-review and rejected records cannot cross the public adapter.

## 7. i18n

Status: DONE

- Route, Garage, 3D, Team Detail, Preview, Updates, Circuits, loading/error and stale/offline/data labels exist for ES, EN, IT, PT-BR, FR and DE.
- The remaining Team development states, factual/DEMO notices, circuit reference and Garage component/GP fallbacks were localized. Formula 1 component names no longer fall back to English in IT/PT-BR/FR/DE.
- A static six-locale completeness test passes, and runtime switching was verified in the browser for all six locales on the shared shell and Teams; German Garage and Circuits were also checked directly. Product names such as `F1 TECH Score`, `Technical Preview` and `F1 TECH Analysis` remain intentionally invariant.

## 8. Monetization preparation

Status: DONE

- `AdSlot` placements exist only on secondary pages and read `src/config/ads.json`.
- Ads are disabled, have no provider/IDs/SDK/tracking, and never appear over Garage or critical controls.
- Privacy, consent, sponsorship and mobile monetization gates are documented; no consent is invented.

## 9. PWA

Status: PARTIAL

- Approved favicon/PWA identity, 192×192, 512×512 and Apple touch icons are preserved. Manifest uses standalone display and the approved theme color.
- Published `/data/` JSON is network-first with last-successful cache fallback; BGRT has one explicit controlled cache rule; the shell/static asset strategy does not cache all same-origin responses indiscriminately.
- Discreet localized offline/stale/error indicators are wired on factual secondary views.
- Physical install, offline-update and icon QA remains required.

## 10. QA, tests and performance

Status: PARTIAL

- Route-level lazy loading remains active and the Garage/Three chunk stays isolated; the 3D scene was not altered for bundle-size work.
- Automated tests cover strict FIA discovery, infringement rejection, registry size, publication gate, empty-PR prevention, championship fallback/commercial guard, ad default, six-locale/offline completeness, PWA rules and BGRT/Apex invariants: **23/23 pass**.
- `npm run lint`, `npm test`, `npm run build` and `git diff --check` all exit 0. The production build preserves the lazy Garage chunk at 1,057.43 kB minified / 292.90 kB gzip; Vite emits the expected >500 kB advisory.
- Browser QA verified `/inicio`, `/technical-preview`, `/equipos`, `/actualizaciones`, `/circuitos`, team detail, published counts/history, all five update filters, six-locale switching and direct `/garage?gp=italian-grand-prix-2026&team=mercedes`. The BGRT route loaded and query parameters were preserved.
- Full refresh/back/forward coverage at every viewport plus physical mobile/WebGL/PWA install/offline/update testing remains `MANUAL_QA_REQUIRED`; it is not represented as completed.

## 11. Vercel and f1tech.app

Status: USER_ACTION_REQUIRED

- Vite build output, SPA rewrite, public data paths, manifest/service worker and model URL are configured locally. No deployment was performed.
- The BGRT asset is recorded as non-redistributable local evaluation material; public Vercel deployment is BLOCKED until the owner supplies distribution/commercial authorization or otherwise resolves the license without changing the approved active model.
- Vercel login, GitHub repository connection, production deployment and the exact DNS records shown by Vercel require the owner.

## 12. Android / Play Store

Status: PARTIAL

- `docs/ANDROID-ROADMAP.md` defines the later Capacitor/Android, signing, Play Console, privacy, testing and AdMob path.
- No Android project, credential, tracking SDK or ad ID was created before web QA and licensing gates are closed.

## Frozen invariants

- Logo: UNCHANGED.
- Active model: BGRT F1 Concept 2026 at `/models/bgrt-f1-concept-2026.glb`.
- Apex: not active and not a fallback.
- Team colors and Red Bull: UNCHANGED.
- Lighting, shader, camera, hotspots, TeamTheme, Garage layout and typography: UNCHANGED in this production-closure pass.
- `TECHNICAL SHOWROOM`: absent.
- Redundant visible Garage `GRAN PREMIO` label: absent.
- Git: no reset, destructive checkout, branch change, commit or push.
- Deployment: not performed.

## USER ACTION REQUIRED

1. Resolve written public/commercial redistribution rights for the BGRT GLB before Vercel or Play publication.
2. Choose and license the championship provider; recommended evaluation is Sportmonks. Supply its server-side token only through repository/Vercel secrets after reviewing the contracted rights.
3. Approve (or decline) the disabled automated data-PR workflow and repository Actions permissions `contents: write` plus `pull-requests: write`.
4. Connect the GitHub repository to Vercel, perform the first authorized production deploy, and then add `f1tech.app` using only the DNS records Vercel displays.
5. Complete physical mobile/WebGL/PWA install/offline QA at the required devices/viewports before public launch.
