# Graphis — MVP Build Plan (Must-Have)

**Purpose of this document:** this is the exact scope to hand to an AI coding agent for a solo hackathon build. Nothing in this file should be skipped. Nothing outside this file should be attempted until everything here works end-to-end. Extra features live in a separate document (`Graphis_Enhancements.md`) — do not pull from it until this MVP is demo-ready.

---

## 1. Problem Restated

University research is siloed across departments. Researchers can't easily find cross-disciplinary papers, matching datasets, or hidden overlaps between disparate theses.

**Goal:** ingest raw PDFs, markdown files, and code repositories → extract entities and relationships → store them in a queryable graph → surface semantic search, hidden connections, and potential research overlap, with every claim traceable to a source document.

**Positioning statement (use this in the demo pitch):**
> An explainable university research knowledge graph that automatically connects papers, researchers, datasets, methods, and topics — enabling semantic search and surfacing potential cross-disciplinary overlap, with every insight backed by cited evidence.

Note: the brief says "real-time." The honest and defensible framing is **near-real-time, asynchronous processing with live status** — say this explicitly in the demo rather than claiming true real-time. Judges respect precise claims more than inflated ones.

---

## 2. What Changed From the Original Full Plan (Fixes Applied)

| Issue in original plan | Fix applied here |
|---|---|
| Malware scanning, sandboxed parsing, prompt-injection tooling described as MVP | Moved to Enhancements. MVP does file-type/size/extension validation + secret-string regex filtering only — real, implementable, still demoable as "security-aware." |
| Fine-grained ACL (per-user, per-role, per-document visibility) in MVP | Simplified to a single demo-mode auth (login = identity, all authenticated users see all demo data). Full ACL moved to Enhancements. |
| "Real-time" graph claim | Reframed as async pipeline with live status — matches the actual architecture and avoids an indefensible claim under judge questioning. |
| Multi-hop graph traversal via SQL recursive CTEs planned as core | MVP limits graph queries to 1-hop and 2-hop lookups (fast, simple SQL joins). Deeper traversal moved to Enhancements. |
| Entity normalization via controlled vocabularies + human correction | MVP uses simple string normalization (lowercase, strip punctuation, alias dictionary for known abbreviations) — good enough to avoid obvious duplicate nodes without an over-engineered resolution system. |
| Single-point dependency on Vertex AI for embeddings/extraction, no fallback defined | MVP explicitly defines a **local fallback tier** (Sentence-Transformers) that activates automatically if Vertex AI errors or rate-limits, so a repeat of a quota-related failure during judging cannot happen. |
| Community detection, centrality, versioning, idempotency, dead-letter queues in MVP | All moved to Enhancements — real engineering value, but not necessary to prove the core concept. |
| No stated team size/pacing assumption | This is a **solo build with an AI coding agent**. Scope below is sized for that: one person, one agent, single Cloud Run service to start (not multiple independently-scaled workers) — see Section 4. |

---

## 3. MVP Scope (Exactly This, Nothing More)

### Ingestion
- Upload PDF
- Upload Markdown
- Upload a small Git repo (as a `.zip` or public repo URL — README + source files only, skip `.git`, `node_modules`, binaries)

### Extraction (hybrid, in this order — cheapest first)
1. **Regex** — DOI, emails, URLs, GitHub links, dates
2. **Metadata parsing** — PDF title/author/abstract if present
3. **LLM (Vertex AI, with local fallback)** — topics, datasets, methods, implicit relationships

Skip the standalone spaCy/NLP layer for MVP — the LLM step covers named-entity extraction well enough for a demo, and one fewer moving part is one fewer failure point. Move spaCy to Enhancements if you want lower LLM cost later.

### Storage
- AlloyDB (or plain Postgres + pgvector if AlloyDB provisioning eats into your hackathon time — see Section 5 note)
- Tables: `documents`, `nodes`, `relationships`, `embeddings`
- Every relationship stores: `source_document_id`, `page/section`, `confidence`, `extraction_method`

### Search
- Semantic search (vector similarity, top-K)
- Keyword fallback search (simple `ILIKE`/full-text) if vector search returns nothing

### Graph
- Node types: `RESEARCHER`, `PAPER`, `DATASET`, `METHOD`, `TOPIC`
- 1-hop and 2-hop relationship queries only (e.g., "what connects to this paper," "what connects to what connects to this paper")

### Insights (the core "wow" feature — do not cut this)
- **Potential overlap score** between two papers, always labeled "Potential Overlap," never "Duplicate," shown with the underlying evidence (shared dataset / method / topic / citations)
- **Cross-department connection** surfaced when two researchers in different departments share a dataset, method, or topic

### Security (real, not theater)
- File type/extension/size validation on upload
- Regex-based secret detection on repo files (`API_KEY=`, `.env`, `credentials.json`, `private_key`, etc.) — flagged files are excluded from ingestion, not processed
- Basic prompt-injection hygiene: document text is always passed to the LLM as clearly-delimited **data**, never concatenated into the instruction portion of the prompt

### Reliability
- Processing status states: `UPLOADED → EXTRACTING → EMBEDDING → STORED → COMPLETED / FAILED`
- One retry on transient failure (network/API timeout), then mark `FAILED` — no dead-letter queue needed for MVP

---

## 4. Simplified Architecture (Solo + AI Agent Friendly)

```text
        FRONTEND (simple web UI)
                |
                v
        CLOUD RUN (single service)
   - upload endpoint
   - status endpoint
   - search endpoint
   - graph endpoint
                |
                v
        CLOUD STORAGE (raw files)
                |
                v
   BACKGROUND TASK (in-process async, e.g. FastAPI
   BackgroundTasks or a simple queue table — see note)
                |
                v
        EXTRACTION PIPELINE
   Regex -> Metadata -> LLM (Vertex AI)
                |
                v
   EMBEDDING SERVICE
   Vertex AI (primary) -> Local Sentence-Transformers (fallback)
                |
                v
        ALLOYDB / POSTGRES + pgvector
   nodes | relationships | embeddings
                |
                v
        QUERY API (search, graph, overlap)
                |
                v
        FRONTEND (search, graph view, overlap view)
```

**Important simplification vs. the original plan:** skip Pub/Sub for the MVP. A single Cloud Run service with an in-process background task queue (or a simple `status` column you poll) does the same job for demo purposes with far less infrastructure to configure and debug solo. Pub/Sub + separately-scaled workers is real production practice — put it in Enhancements, not here. This is the single biggest time-saver in this plan.

---

## 5. Fallback Chain (Directly Solving Your Known Failure Mode)

This is the resilience pattern from your Groq-disqualification experience, applied here:

```text
Embedding/extraction request
        |
        v
   Try Vertex AI
        |
   fails / quota / timeout?
        |
        v
   Fall back to local Sentence-Transformers
   (e.g. all-MiniLM-L6-v2 or bge-small-en, run on
   your workstation GPU or as a small Cloud Run instance)
        |
   still fails?
        |
        v
   Use cached embeddings from a prior successful run
   of the same demo documents (pre-computed, stored
   alongside the demo dataset)
```

Build and test this fallback path **before** the demo, not as an afterthought — deliberately kill your Vertex AI key locally at least once during testing and confirm the app still completes the pipeline.

**AlloyDB note:** AlloyDB provisioning/networking setup can eat hours you don't have solo. If it's taking too long, standing up a plain Cloud SQL Postgres instance with the `pgvector` extension gets you the same functional demo (vector search + relational tables) with far less setup risk. You can still describe the target production architecture as AlloyDB in your pitch — just don't let provisioning it block your build time.

---

## 6. Judge Demo Flow (Unchanged Core, Trimmed to What's Actually Built)

1. **Upload** — 2-3 papers from different departments + one small repo
2. **Status** — show `UPLOADED → EXTRACTING → EMBEDDING → COMPLETED` live
3. **Search** — natural language query, show ranked semantic results
4. **Graph** — click a researcher, show 1-2 hop connections
5. **Overlap** — show one clear "Potential Overlap" example with evidence breakdown
6. **Explainability** — click "Why?" on any result, show source document + page/section

Seven steps in the original plan is fine, but steps 5-7 can be folded into one flow (overlap card that already includes the "why" evidence inline) if you're short on demo time.

---

## 7. Build Order for the AI Agent (Solo Pacing)

1. Cloud Storage upload + Cloud Run skeleton + Postgres/AlloyDB schema
2. Regex + metadata extraction, stored to DB, status tracking working end-to-end for one PDF
3. Vertex AI extraction + embeddings, with local fallback wired in and tested
4. Vector search endpoint + simple frontend search box
5. Graph endpoint (1-hop, 2-hop) + minimal graph view in frontend
6. Overlap scoring logic + evidence display
7. Security validation (file checks, secret regex) + status polling UI
8. Seed demo dataset (3-4 documents chosen specifically to produce one clean overlap example and one clean cross-department example) + rehearse the demo flow

Do not start step 2 features until step 1 is fully working. Do not attempt anything from `Graphis_Enhancements.md` until step 8 is done and rehearsed.

---

## 8. Evaluation Criteria Coverage (What You Can Honestly Claim)

- **Security:** file validation, secret detection, prompt-injection-aware prompting
- **Scalability:** Cloud Run, vector indexing, top-K search (note: describe Pub/Sub-based worker scaling as the production roadmap, not built)
- **Reliability:** processing status states, one-retry handling
- **Performance:** regex-before-LLM ordering, cached embeddings, vector search over pairwise comparison
- **Accuracy:** hybrid extraction, confidence scores, provenance shown in UI
- **Innovation:** cross-disciplinary graph, evidence-backed overlap detection (not naive similarity)
- **Usability:** natural language search, explainable results, simple dashboard

Be precise in the pitch about what's built vs. what's roadmap — judges generally reward honesty about scope over inflated claims, especially in a security/scalability-graded challenge.
