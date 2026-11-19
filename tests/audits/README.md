# FIA 2026 historical audit

Run the preserved 2026 reconstruction audit explicitly with:

```sh
npm run fia:audit:2026
```

This is a forensic comparison of captured official PDF layouts, the audit ledger, and the datasets already stored under `public/data/grands-prix/2026/`. It checks historical per-event counts, source assignments, reviewed page continuations, and whether a fresh parser reconstruction is byte-stable with each old dataset. It does not download PDFs or rewrite datasets.

The historical fixtures and assertions are intentionally retained in `tests/fia-2026-full-audit.audit.mjs`. They are outside the default `npm test` command because they compare old publications with the current parser/reconstruction policy; they do not validate the scheduled publication state machine. Do not treat failures here as permission to regenerate an already published GP. Investigate or reconcile historical data only as a separate, explicitly authorized task.

The operational safety coverage remains in `npm test`: exact-title discovery and ambiguity, pending/retry/error states, immutable `ALREADY_PUBLISHED` behavior, publication/translation validation, unknown-team rejection, cross-page review bound to the current PDF, atomic dataset publication, and the workflow's final status/push guards.

At the time this suite was separated, its result was 1 passing test and 23 failures. The failures are retained as audit findings rather than suppressed or rewritten: the 2026 aggregate reconstruction has no publishable dataset under current validation, and the 16 stored datasets do not match fresh parser-v4 reconstructions. Several event-specific source assertions consequently cannot read a candidate dataset. No historical dataset was changed to produce this result.
