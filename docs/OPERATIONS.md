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

The publication check compares the official document hash. An unchanged hash returns `UNCHANGED`, preserves file timestamps/content and does not duplicate records. If the same URL yields a new hash, it is treated as a new revision; the prior public dataset remains until the new non-empty records independently pass all validators and the atomic writer succeeds.

## Manual review and deterministic mappings

Review the relevant JSON under `ingestion/output/manual-review/`. Keep the raw FIA component wording, source row, reason and non-binding suggestions. Add an exact alias to `ingestion/fia/component-registry.mjs` only when the equivalence is technically unambiguous, add a regression test, then rerun the original document. Fuzzy matching may suggest; it must never publish.

## Scheduled discovery

`.github/workflows/fia-ingestion.yml` is active as a read-only staging workflow. Scheduled/manual runs can generate validated public JSON inside the job and upload it as an artifact, but `permissions: contents: read` prevents repository mutation.

Expected Madrid/future behavior:

```text
FIA publishes an official event index/document
→ scheduled job detects Car Presentation Submissions
→ download/hash/extract/parse/normalize/validate
→ deterministic records enter staged public JSON
→ ambiguous rows remain manual review
```

GitHub schedules are best-effort; do not promise an exact publication hour.

## Automated data PR publication

Recommended strategy A is an automated data-only pull request. It gives an auditable diff, branch protection, rollback and review while keeping manual-review artifacts private. Strategy B—a direct bot commit to `main`—has lower latency but weaker review/rollback controls and larger blast radius; it is not enabled.

`ingestion/fia/prepare-pr.mjs` builds an allowlisted plan for only `data/grands-prix/` and `public/data/grands-prix/`. No changed allowlisted file means `safeToPropose: false`, so an empty PR cannot be opened. Raw PDFs, draft, validated, manual-review and temporary files are excluded.

`.github/workflows/fia-data-pr.yml.disabled` is the prepared, deliberately inactive implementation. To activate it, the owner must:

1. Review/pin the `peter-evans/create-pull-request` action according to repository policy.
2. In GitHub repository Settings → Actions → General → Workflow permissions, allow read/write and pull-request creation.
3. Rename the template to a `.yml` workflow and review its branch protection interaction.
4. Keep `contents: write` and `pull-requests: write` scoped only to that job; do not add a personal token.
5. Run it manually first and inspect hashes/counts before adding a schedule.

After approval, the final production path is:

```text
FIA publishes
→ scheduled GitHub Action
→ ingestion + validation + tests
→ changed allowlisted dataset
→ create/update data PR
→ maintainer/approved automation merges
→ GitHub main changes
→ Vercel automatically builds/deploys
→ /public/data changes become visible in F1 TECH
```

Future auto-merge should be a repository policy on deterministic data PRs, not a second ingestion pipeline. Preserve the manual-review branch.

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

## Vercel deployment

Preflight locally:

```powershell
npm run lint
npm test
npm run build
git diff --check
```

`vercel.json` builds Vite to `dist` and supplies the SPA fallback. Verify that `/data/grands-prix/2026/*.json`, `/manifest.webmanifest`, `/sw.js`, icons and `/models/bgrt-f1-concept-2026.glb` survive the deployment. The model is ignored by Git and currently lacks public/commercial redistribution authorization, so production deployment must wait for that owner-controlled license decision.

Authorized first deployment steps:

1. Sign in to Vercel and choose Add New → Project.
2. Import the GitHub `f1-tech` repository and authorize only the needed repository.
3. Confirm Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`, and install command `npm ci`/automatic equivalent.
4. Deploy Production and record the temporary Vercel URL.
5. Open `/inicio`, every direct SPA route, a known Monza JSON URL, `manifest.webmanifest` and `sw.js`; refresh and test back/forward.
6. Install/test the PWA and validate offline retained JSON plus BGRT on an authorized device.

No Vercel login or deployment is performed by this repository preparation.

## f1tech.app

After a successful authorized deployment: Project → Settings → Domains → Add `f1tech.app`. Use exactly the DNS values Vercel displays at that time; do not guess A/CNAME records. Configure them at the domain registrar, wait for Vercel verification/HTTPS, then choose one canonical hostname. Recommended policy: apex `f1tech.app` canonical and `www.f1tech.app` redirecting to it, unless the owner deliberately chooses the reverse.

Recheck all routes, `/inicio`, one published Monza JSON, the service worker and PWA installation on the canonical HTTPS domain. Add the canonical metadata only when the final hostname is live.
