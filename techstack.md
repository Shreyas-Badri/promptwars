# Graphis — Tech Stack

Scoped for a solo hackathon build with an AI coding agent. "MVP" = build this first, matches `Graphis_MVP_Build_Plan.md`. "Enhancement" = only touch after MVP demo works, matches `Graphis_Enhancements.md`.

| Layer | Technology | Scope | Why |
|---|---|---|---|
| **Frontend** | Next.js + React + TypeScript | MVP | Fast to build, polished UI, easy deployment |
| **UI** | Tailwind CSS | MVP | Quick styling |
| **Graph visualization** | Cytoscape.js | MVP | Purpose-built for interactive knowledge graphs, better fit than raw D3 here |
| **Charts** | Recharts | MVP | Dashboard statistics |
| **Backend API** | Python + FastAPI | MVP | Strong fit for AI/NLP/PDF processing |
| **Async processing** | FastAPI BackgroundTasks + status polling | MVP | Non-blocking uploads without the GCP config overhead of Pub/Sub |
| **Async processing (upgrade)** | Pub/Sub + independently-scaled workers | Enhancement | Real scalability story once MVP works — demo with a burst upload |
| **Database** | Cloud SQL Postgres + pgvector (build) / AlloyDB (stated target) | MVP | Cloud SQL is faster to provision solo; describe AlloyDB as the production target in your pitch. Try AlloyDB first if time allows — fall back to Cloud SQL if setup drags. |
| **Vector search** | pgvector | MVP | Semantic similarity, same API whether on Cloud SQL or AlloyDB |
| **File storage** | Cloud Storage | MVP | PDFs, Markdown, repository files |
| **AI (primary)** | Vertex AI | MVP | Embeddings + difficult entity/relationship extraction; matches expected GCP stack |
| **AI (fallback)** | sentence-transformers (local, e.g. `all-MiniLM-L6-v2` or `bge-small-en`) | MVP | Resilience — activates automatically if Vertex AI errors, rate-limits, or times out. Directly prevents a repeat of a quota-related failure during judging. |
| **Deployment** | Cloud Run | MVP | Expected GCP stack |
| **Authentication** | Firebase Auth | MVP | Fastest to wire into Next.js; single role, demo-mode access for MVP (no granular ACL yet) |
| **Graph algorithms** | NetworkX (community detection, centrality) | Enhancement | Strong "wow" feature once real graph data exists — not required to prove the core concept |
| **Local NLP (optional)** | spaCy | Enhancement | Reduces LLM calls for common entities (names, orgs) if you want to further cut AI dependency |
| **Security (basic)** | File type/size/extension validation, regex-based secret detection | MVP | Real and implementable in the time available |
| **Security (advanced)** | Malware scanning (e.g. ClamAV), sandboxed parsing, prompt-injection red-teaming | Enhancement | Good roadmap talking points; only build if far ahead of schedule |
| **Authorization** | Full ACL (`PUBLIC` / `DEPARTMENT_ONLY` / `RESTRICTED` / `PRIVATE`) | Enhancement | Not needed for a single-tenant demo |

---

## Fallback Chain (build and test this early)

```text
Vertex AI (primary)
      |
   fails / quota / timeout
      |
      v
sentence-transformers (local, MVP)
      |
   still fails
      |
      v
Cached embeddings from a pre-run of the demo dataset
```

Test this by deliberately breaking the Vertex AI key locally at least once before the demo and confirming the pipeline still completes.
