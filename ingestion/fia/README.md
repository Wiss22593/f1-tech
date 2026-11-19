# FIA ingestion

This Node-only boundary runs outside React: finder → downloader → PDF-text extractor → parser → normalizer → validator → published JSON. Raw PDFs are temporary/archive inputs and must never be placed in `public/`. The parser is deliberately conservative; records with unknown team/component or missing description fail validation and the previously published dataset remains untouched.

## Automatic publication states

For the scheduled current event, discovery accepts only the official event's exact **Car Presentation Submissions** title. No matching PDF returns `PENDING`, which is checked again by the next scheduled run. More than one exact-title PDF returns `AMBIGUOUS` and none is selected. A complete, validated dataset is terminal for that event: scheduled and direct runs return `ALREADY_PUBLISHED` before consulting the FIA document index or downloading the PDF. Its source hash remains provenance for the published records; it is not polled for later changes. Discovery, download, parsing, translation, or validation errors return a failed workflow run with an `ERROR` summary, and the next scheduled run can retry. Successful local processing is `READY_TO_PUBLISH`; the workflow reports `PUBLISHED` only after validation and a successful push to `main`.
