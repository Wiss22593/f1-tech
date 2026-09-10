# 2026 FIA ingestion report

Last verified: 2026-09-10

Only official FIA indexes and PDFs explicitly identified as `Car Presentation Submissions` are accepted. Technical delegate reports, infringements, decisions and generic documents containing “technical” are excluded.

| GP | FIA index | Document found | Document title | SHA-256 | Parsed | Published | Manual review | Error | Final status |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Australian GP | verified | yes | Doc 9 — Car Presentation Submissions | `9e9ccc09667faa4f612a32edab64e41b1d7ff914778e5681d96cd4ff81dbb5dd` | 39 | 15 | 26 | none after retry | PROCESSED |
| Chinese GP | verified | yes | Doc 10 — Car Presentation Submissions | `e113dd8e20a71be5f18ff28e8a94351d2699895e09207294f73cfaecd395840b` | 4 | 4 | 1 | none | PROCESSED |
| Japanese GP | verified | yes | Doc 11 — Car Presentation Submissions | `a8fcc30bcae36d21d52c7d3c50dc76c197949b48843653c15ae9d15facaec3a6` | 13 | 5 | 11 | none | PROCESSED |
| Saudi Arabian GP | called off; no verified index | no | — | — | 0 | 0 | 0 | official 2026 event status is called off | NO_DOCUMENT_FOUND |
| Miami GP | verified | yes | Doc 8 — Car Presentation Submissions | `3ba75eb51c6ce045b3e5c11279e359e1ddaa0f825a251886d9c6f7a7b307de5e` | 39 | 27 | 31 | none after retry | PROCESSED |
| Canadian GP | verified | yes | Doc 11 — Car Presentation Submissions | `5971fae2e70a5e17ad87fbdd400e2287f064ee830dfdada8be9f7f36c882193e` | 22 | 17 | 16 | none | PROCESSED |
| Monaco GP | verified | yes | Doc 15 — Car Presentation Submissions | `513eca62751dd9e24be31a313058e3efc949ad72ed25a21fbd5a86d1f2355996` | 22 | 20 | 11 | none | PROCESSED |
| Barcelona-Catalunya GP | verified | yes | Doc 14 — Car Presentation Submissions | `26ba7ae0bf3556c02d0ba691fa350f7d56ec08e9d1830ff10b416429a833c7e9` | 11 | 9 | 2 | none | PROCESSED |
| Austrian GP | verified | yes | Doc 14 — Car Presentation Submissions | `7863deb797bed267fdd978e66170d86f755cf576cffce202739fadf712de0a6c` | 26 | 18 | 21 | none | PROCESSED |
| British GP | verified | yes | Doc 13 — Car Presentation Submissions | `949f1403db5591bb62d84c2f0a3072368d725207a8f281dcf5b9a458a7d04204` | 5 | 3 | 6 | none | PROCESSED |
| Belgian GP | verified | yes | Doc 12 — Car Presentation Submissions | `e3edc39edb92db8b85e8b9216a75979b0738957acd009d0ed0ab4fb87ecd7264` | 15 | 9 | 12 | none | PROCESSED |
| Hungarian GP | verified | yes | Doc 9 — Car Presentation Submissions | `59d9c9d893c2f83c50e65abe2be06cfaad56552c5cdecbbca7e0f3b7e4196ace` | 27 | 18 | 17 | none | PROCESSED |
| Dutch GP | verified | yes | Doc 10 — Car Presentation Submissions | `9c24cee9ec4775e7dd507654b13692500ef9e41e8b1625982a5ab8e2a92100a4` | 14 | 8 | 11 | none | PROCESSED |
| Italian GP | verified | yes | Doc 10 — Car Presentation Submissions | `55541780261498d2f329dae1748df636a871072f26a580dd027de78669442d81` | 17 | 17 | 9 | none | PROCESSED |
| Madrid / Spanish GP | verified | no | — | — | 0 | 0 | 0 | none; expected absence | NO_DOCUMENT_FOUND |
| Azerbaijan GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| Bahrain GP (Sepang, Malaysia) | future index pending | no | — | — | 0 | 0 | 0 | rescheduled by FIA to 02–04 October | FUTURE |
| Singapore GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| United States GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| Mexico City GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| São Paulo GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| Las Vegas GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| Qatar GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |
| Abu Dhabi GP | future index pending | no | — | — | 0 | 0 | 0 | none | FUTURE |

## Totals

- Registered GP: 24
- Verified official FIA indexes: 14
- Valid Car Presentation Submissions documents: 13
- Parsed rows: 254
- Published deterministic records: 170 across 13 public datasets
- Manual-review entries: 174
- `NO_DOCUMENT_FOUND`: 2
- Future events awaiting official indexes: 9
- Unresolved final errors: 0

The complete backfill report at `ingestion/output/reports/2026-backfill.json` records a transient Australia event timeout and a Miami PDF HTTP 504 during its last full pass. Both were then retried against the same official indexes: Australia and Miami returned `UNCHANGED` with their existing SHA-256 hashes, so no duplicate, `publishedAt` change or dataset rewrite occurred. The failures are therefore recovered, not concealed.

Madrid has an official FIA event index but no matching presentation document as of the verification time. It stays empty until FIA publishes the document and a scheduled run detects and validates it. No URL, update or publication time is inferred.
