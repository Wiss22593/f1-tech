# F1 TECH operations

## FIA ingestion

Run one verified event as review-only:

```powershell
npm run fia:ingest -- --index-url=<official-fia-event-index> --grand-prix=<stable-id> --event-name="<FIA event name>" --season=2026
```

Add `--publish=true` only when safe public JSON should be staged. The single pipeline finds only explicit `Car Presentation Submissions`, downloads with SHA-256, extracts the PDF text layer, parses, normalizes, validates and applies the publication gate. It never accepts an infringement/decision merely because its title contains “technical”, never publishes fuzzy suggestions and never replaces a public dataset with an empty result.

Timeouts are controlled by `FIA_FETCH_TIMEOUT_MS` (index/download, default 30 seconds) and `FIA_EVENT_TIMEOUT_MS` (child event, default 90 seconds). A timed-out GP is recorded `ERROR`; the loop continues. Retry the affected event without deleting an existing public JSON.

Artifacts are separated:

- `ingestion/raw/`: transient source PDFs, ignored by Git.
- `ingestion/output/draft/` and `validated/`: internal review artifacts, ignored.
- `ingestion/output/manual-review/`: ambiguous/rejected entries, ignored.
- `public/data/grands-prix/<season>/`: only publication-gated datasets.

## Registry, backfill and current GP

`data/grands-prix/2026.json` is the only event registry shared by Node ingestion and React. Do not invent FIA URLs. Register a URL only after the official FIA event index resolves and identifies the intended event.

```powershell
npm run fia:backfill -- --season=2026 --backfill=true --publish=true
npm run fia:current -- --season=2026 --publish=true
```

Backfill runs all 24 rounds. Current mode selects the active event window or nearest upcoming event. A missing index for a past round becomes `NO_DOCUMENT_FOUND`; an unpublished future index remains `PENDING`/`FUTURE`. A verified index with no presentation PDF returns success as `NO_DOCUMENT_FOUND`.

The registry follows the current FIA calendar: Saudi Arabia is called off, while the Bahrain Grand Prix is scheduled at Sepang, Malaysia, on 2–4 October 2026. Do not reuse the former Sakhir dates or invent an event index before FIA publishes one.

The publication check compares the official document hash. An unchanged hash returns `UNCHANGED`, preserves file timestamps/content and does not duplicate records. If the same URL yields a new hash, it is treated as a new revision; the prior public dataset remains until the new non-empty records independently pass all validators and the atomic writer succeeds.

## Manual review and deterministic mappings

Review the relevant JSON under `ingestion/output/manual-review/`. Keep the raw FIA component wording, source row, reason and non-binding suggestions. Add an exact alias to `ingestion/fia/component-registry.mjs` only when the equivalence is technically unambiguous, add a regression test, then rerun the original document. Fuzzy matching may suggest; it must never publish.

## Scheduled discovery

`.github/workflows/fia-ingestion.yml` remains available as a manual read-only staging/backfill workflow. It can generate validated public JSON inside the job and upload it as an artifact, but `permissions: contents: read` prevents repository mutation.

`.github/workflows/fia-auto-publish.yml` is the production scheduler. GitHub cron uses UTC, so two entries cover Thursday and Friday from 06:17 through 23:47 in `America/Argentina/Buenos_Aires`:

- `17,47 9-23 * * 4,5`
- `17,47 0-2 * * 5,6`

Scheduled starts are best-effort, not exact. Before installing dependencies or contacting FIA, `ingestion/fia/auto-publish.mjs window` exits successfully unless the local Buenos Aires date is between the day before a registered GP and its final event day. `workflow_dispatch` provides an equivalent manual check.

Expected Madrid/future behavior:

```text
FIA publishes an official event index/document
→ scheduled job detects Car Presentation Submissions
→ download/hash/extract/parse/normalize/validate
→ deterministic records enter atomic public JSON
→ ambiguous rows remain manual review
```

For `NO_DOCUMENT_FOUND`, `UNCHANGED` or `MANUAL_REVIEW_ONLY`, the repository diff is empty and the job exits successfully without a commit or push. Extraction/validation failures fail the job and leave the prior public dataset untouched.

## Automated data publication

The production path commits deterministic data directly to `main` with the repository-scoped `GITHUB_TOKEN`; no PAT or additional secret is used. The workflow requests only `contents: write`, uses a single non-cancelling concurrency group and has a 25-minute job timeout.

`ingestion/fia/auto-publish.mjs validate` rejects the run if any working-tree path is outside `public/data/grands-prix/2026/<grandPrixId>.json`, if the changed dataset does not match the active event, if it is empty, or if its schema, official FIA URL/title/hash, record validation state, deterministic confidence, component/team/GP/season mapping, duplicate check or published count fails. Only the single expected event JSON is staged after this final guard. Raw PDFs, source code, docs, registry metadata, drafts, manual-review and temporary files cannot enter the automated commit.

The bot identity is `github-actions[bot]`; the commit message names the detected GP. If the push is rejected, the workflow reports `BRANCH_PROTECTION_BLOCKED`, does not bypass repository policy and uploads the validated JSON/report as an artifact. An API permission probe reports an explicit error when the workflow token is known not to have push permission, without creating a test commit.

`.github/workflows/fia-data-pr.yml.disabled` remains a deliberately inactive, reviewed fallback for a future manual/PR policy. It is not part of the full-auto production path.

The production path is:

```text
FIA publishes
→ scheduled GitHub Action
→ strict discovery + ingestion + validation + tests
→ final data-only allowlist
→ github-actions[bot] commits the validated event JSON to main
→ push origin/main
→ Netlify automatically builds/deploys
→ https://formulatech.netlify.app
→ /public/data changes become visible in F1 TECH
```

Manual-review remains outside Git and never blocks publication of other deterministic records. It must be resolved through the existing mapping/review process, never by weakening the automatic gate.

## Championship source policy

Championship ingestion is independent of FIA technical PDFs. `ChampionshipProvider` owns driver/constructor standings and metadata; the last valid real snapshot is the only runtime fallback.

- Jolpica: technically verified for 2026 but CC BY-NC-SA; development/tests only. `resolveChampionshipSource` blocks it unless `ALLOW_NONCOMMERCIAL_CHAMPIONSHIP=true`, and its runner writes only under ignored development output.
- Sportmonks: recommended commercial candidate. It documents commercial app/site use, JSON, F1 coverage, token auth, 3,000 calls/hour/endpoint and a paid F1 plan. Account, subscription rights and token are required before its adapter can be enabled.
- Sportradar: structured production API with authentication and standings, but requires an Order Form and may require written approval for advertising use.
- API-Sports: inexpensive and structured, but its public terms say it does not grant competition publication/commercial rights; not selected.

Until the owner contracts/approves a source, status is `CHAMPIONSHIP_SOURCE_USER_DECISION_REQUIRED`; no Jolpica JSON is shipped as commercial production data and DEMO zeros are never relabelled as real.

## Product boundary and PWA

Garage, Technical Preview, Actualizaciones and Equipos load only schema-valid `published` JSON. The service worker uses network-first for `/data/`, explicitly cache-first for `/models/bgrt-f1-concept-2026.glb`, navigation shell fallback and controlled static caching. It does not cache every same-origin response. Secondary factual views show localized stale/error status when a retained dataset is used or refresh fails.

Before launch, test installability, update behavior, JSON offline fallback and BGRT load on physical devices. Clear old service-worker caches when testing a new cache version; do not broaden cache scope as a workaround.

## Ads, privacy and Android

`src/config/ads.json` keeps all web ad placements disabled. `AdSlot` exists only on Technical Preview, Updates, Teams and Circuits and renders nothing without an explicit provider, IDs and consent setup. Never place ads over Garage/3D controls. Before AdSense/analytics, publish a privacy policy, inventory cookies/SDKs, implement region-appropriate consent and withdrawal, and ensure sponsor/affiliate content is disclosed.

The future Capacitor/Android/Play/AdMob sequence and its signing, store and privacy gates are in `docs/ANDROID-ROADMAP.md`. Do not generate the Android project until web QA, standings rights and BGRT distribution rights are closed.

## Netlify deployment

Preflight locally:

```powershell
npm run lint
npm test
npm run build
git diff --check
```

Netlify is the active production host at `https://formulatech.netlify.app`. The site is connected to the GitHub `main` branch: each push to `main` triggers the Netlify production build and deployment automatically. Vite builds to `dist`, and `public/_redirects` supplies the working SPA fallback.

The live deployment path is:

```text
GitHub main
→ Netlify automatic deploy
→ https://formulatech.netlify.app
```

After each production deploy, verify `/inicio`, every direct SPA route, a known Monza JSON URL, `manifest.webmanifest` and `sw.js`; refresh and test back/forward. Install/test the PWA and validate offline retained JSON plus BGRT on an authorized device. The BGRT redistribution/license decision remains an owner-controlled legal gate independent of the hosting provider.

## Custom domain

No custom domain has been purchased or configured. The canonical production origin is currently `https://formulatech.netlify.app`.

If a custom domain is purchased later, add it from Netlify Domain management and use exactly the DNS values Netlify displays at that time; do not guess A/CNAME records. Wait for DNS verification and HTTPS, choose a canonical hostname plus an explicit redirect policy, then recheck all routes, `/inicio`, one published Monza JSON, the service worker and PWA installation. Update canonical metadata only after that hostname is live.
