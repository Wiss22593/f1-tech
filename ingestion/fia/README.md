# FIA ingestion

This Node-only boundary runs outside React: finder → downloader → PDF-text extractor → parser → normalizer → validator → published JSON. Raw PDFs are temporary/archive inputs and must never be placed in `public/`. The parser is deliberately conservative; records with unknown team/component or missing description fail validation and the previously published dataset remains untouched.
