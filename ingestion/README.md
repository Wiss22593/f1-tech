# FIA ingestion boundary

This directory is intentionally outside the React runtime. A future scheduled job
must download FIA documents, parse and validate them, then publish structured JSON.
It must retain the previous published dataset on failure and never expose raw PDFs
through `public/`.

Expected pipeline: `finder → downloader → parser → normalizer → validator → JSON`.
The frontend contracts live in `src/services/fia/types.ts`; no FIA network client is
connected in this repository yet.
