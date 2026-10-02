# FIA 2026 official layout fixture

`fia-2026-official-layouts.json.gz` contains the PDF.js text runs, painted table borders, document URLs and SHA-256 hashes of all 16 published GP source PDFs, downloaded afresh on 2026-10-02. It is compressed JSON, not synthetic expected output. Tests run the production reconstruction path against these original inputs and compare the published records and the per-team audit ledger. The official URLs and hashes are also in `docs/fia-2026-full-audit.md`.

Headerless continuation approvals are separate, exact-source-bound evidence in `data/fia-reviewed-sections/2026.json`. Williams Australia page 10 is an image table: its four visually inventoried rows remain manual_review.
