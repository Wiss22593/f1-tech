# Spanish technical translations

The scheduled FIA pipeline keeps the four original English FIA columns unchanged. It first reuses exact, source-bound reviewed Spanish phrases. Missing fields use CPU neural translation inside the runner; no source text goes to a hosted inference service. The model and engine revisions, quantization, glossary version and languages are pinned in src/data/fia-localization/automatic-policy.json. npm ci --prefix ingestion/fia/translation-runtime installs the separate locked runtime.

Automatic entries carry method=automatic, reviewStatus=unreviewed, sourceKey, provider and fieldMethods. They never populate the reviewed phrase catalogue. Spanish readers see the automatic/unreviewed notice and can expand all four original FIA fields and follow the official PDF. For fresh parser records, reviewed catalogue phrases are used before model inference. A source or policy change invalidates old machine provenance and the translation cache.

The glossary protects generic aerodynamic terminology; it contains no event-specific records. Validation rejects incomplete output, damaged glossary markers, changed quantities, missing acronyms, lost negation and selected technical cues. These checks cannot prove semantic equivalence or human translation quality. Machine output can have awkward grammar. A failed translation/model request stops publication; there is no English-only fallback or fabricated text.

Model weights and translation caches stay in ignored ingestion/output. The workflow restores the immutable model cache and runs inference only when a new/changed official document needs processing. The scheduled runner does not require a personal computer to remain online. Its cache is optional: a cold runner downloads the pinned model. A download or unsupported source failure is visible and fails closed.

To review a translation, use the established source-bound reviewed catalogue process; do not relabel an automatic entry as reviewed. Changing the model/glossary needs a policy version change and real-document regression checks. Run scheduled.mjs --dry-run=true for read-only end-to-end verification; --check-now=true only tests discovery.

Model: https://huggingface.co/Xenova/opus-mt-en-es/tree/4b002a4c7edd54a7ced58877258b87f7efd3f892
Base model/license (Apache 2.0): https://huggingface.co/Helsinki-NLP/opus-mt-en-es
Engine documentation: https://huggingface.co/docs/transformers.js
