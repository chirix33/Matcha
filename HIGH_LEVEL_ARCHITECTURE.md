               ┌─────────────────────────────────────┐
               │           Frontend (Web)            │
               │  - React/Next.js UI                 │
               │  - Multi-step profile form          │
               │  - Job results & explanations       │
               └───────────────▲─────────────────────┘
                               │ HTTPS (REST/JSON)
                               │
┌──────────────────────────────┴─────────────────────────────┐
│                     Backend API Layer                      │
│  (Node/Express or FastAPI)                                 │
│                                                            │
│  ┌──────────────────┐   ┌──────────────────┐               │
│  │  Auth Controller │   │ Profile Controller│              │
│  │  (login, JWT)    │   │ (CRUD profiles)   │              │
│  └──────────────────┘   └─────────▲────────┘              │
│                                    │                       │
│                     ┌──────────────┴──────────────┐        │
│                     │  Profile Service (PII)      │        │
│                     │  - stores user + profile    │        │
│                     │  - exposes anonymized view  │        │
│                     └──────────────┬──────────────┘        │
│                                    │ anonymized features   │
│                         ┌──────────┴───────────┐           │
│                         │  Matching Orchestrator│         │
│                         │  - calls AI services  │         │
│                         │  - fallback logic     │         │
│                         └───────┬───────┬──────┘         │
│                                 │       │                │
└─────────────────────────────────│───────│────────────────┘
                                  │       │
                     ┌────────────┘   ┌───┴────────────────┐
                     │                │                    │
          ┌──────────▼──────┐  ┌──────▼────────┐   ┌───────▼───────┐
          │ Hugging Face    │  │ LLM API       │   │ Vector DB      │
          │ Inference (Whisper,│ (GPT/Claude) │   │ (pgvector /    │
          │ embeddings)      │  │ - scoring    │   │ Pinecone, etc.)│
          └──────────────────┘  └──────────────┘   └───────────────┘

       ┌─────────────────────────────────────────────────────────┐
       │                     Data Layer                          │
       │ ┌──────────────┐  ┌────────────────┐  ┌──────────────┐ │
       │ │ PostgreSQL   │  │ ProfileFeatures│  │ Jobs dataset │ │
       │ │ (Users, PII) │  │ (no PII)       │  │ + metadata   │ │
       │ └──────────────┘  └────────────────┘  └──────────────┘ │
       └─────────────────────────────────────────────────────────┘


## Main components

### Frontend (React/Next.js)

Profile Capture UI: multi-step form with text + microphone for speech input; shows live transcript, lets users edit before saving.

Job Recommendations UI: displays recommended jobs, “why this fits you” explanation, and company insight card per job.
Simple Admin UI (optional): view sample profiles/jobs for demo.

### Backend API
Auth Controller: handles login/signup (or simple demo auth) and issues JWTs; keeps authentication concerns separate.

Profile Controller / Service (PII layer):
Stores user and profile data (skills, experience, preferences) in PostgreSQL.

Implements ASR3: exposes a getAnonymizedProfile(profileId) style method that returns only skills, experience level, and preferences, with no name/email/etc.

Matching Orchestrator:
Takes anonymized profile features, calls AI/matching services, and assembles a list of jobs + explanation data for the frontend.

Implements ASR1: timeout + fallback; if AI fails, switches to simple keyword-based matching and marks results as approximate.

Implements ASR2: returns not only scores but also matched skills, preference overlaps, and reasoning tokens used to construct explanations.

### AI / External services

Hugging Face Inference
Whisper (openai/whisper-small) endpoint used by backend /api/transcribe to convert uploaded audio chunks into text.
Optional text embedding model (e.g., sentence-transformer) used to embed profiles/jobs for semantic search.
LLM API (OpenAI / Anthropic, etc.)

Used to:
Score matches (aspiration / skill / experience fit) given anonymized profile + job text.
Generate explanation snippets and company insight cards in simple language.

### Data stores

PostgreSQL
users and profiles tables with PII and job-related fields.
profile_features table (no PII) storing normalized/anonymized text fields and possibly cached embeddings.
A small curated jobs table for the class demo (no real job-board integration).

Vector store (optional but nice-to-have)
Either a dedicated service (Pinecone) or PostgreSQL with pgvector.
Stores job embeddings and lets the Matching Orchestrator retrieve top-N similar jobs for a profile efficiently.
Key data flows

1. Profile capture flow (FR1, NFR2, ASR3)
User opens the multi-step profile UI on the frontend.
If they use voice, frontend records audio and POSTs to /api/transcribe.
Backend sends audio to Hugging Face Whisper, gets transcript, and returns it to the frontend.
User edits/accepts the transcript; frontend submits profile data to POST /api/profiles.
Backend’s Profile Service:
Stores full profile (with PII) in PostgreSQL.
Also writes an anonymized feature view (skills, experience, preferences) into profile_features.

2. Job matching and explanations (FR2, FR3, ASR1, ASR2)
Frontend calls POST /api/matches with the current profile ID.
Backend Matching Orchestrator loads anonymized features from profile_features.
Orchestrator calls:
Vector DB to get top-K similar jobs (via profile embedding).
LLM API to compute per-job scores (aspiration/skill/experience) and capture structured reasoning (e.g., “matched skills: X, Y; preference overlap: remote, small company”).
LLM or Hugging Face summarization to generate company insight cards from job/company text.
Orchestrator returns a list of jobs + structured explanation fields; frontend renders human-readable cards:
“Why this fits you” (built from matched skills + reasoning).
Company insight (size, industry, description, key responsibilities).

3. Fallback & robustness (ASR1)
Matching Orchestrator wraps all external AI calls with timeouts (e.g., 3–5 seconds).
On failure or timeout, it:
Uses a simple keyword-based search over the jobs table (e.g., intersection of skills, roles, industry).
Marks response as approximate and returns a simpler explanation (e.g., “matched on skills: X, Y, Z”).
This keeps end-to-end latency within your 5-second NFR, even when AI is slow.

4. Privacy boundary enforcement (ASR3 / NFR3)
Frontend never sends explicit identifiers (name, email) to AI endpoints; only the backend’s Profile Service ever sees PII.
Matching Orchestrator and AI services only operate on anonymized features and job text.
Whisper is used only for transcription; raw audio is discarded after processing, and only transcript fields that are needed for job matching are stored.