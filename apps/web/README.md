# Neureel

> Neuroscience-backed content intelligence for brands and marketing teams.

Neureel uses Meta's TRIBE v2 — a trimodal brain encoding AI model — to predict which brain regions get activated when a person watches a video, image, or reel. It translates raw neuroscience output into actionable virality scores and brain activation maps, helping brands reverse-engineer what makes content neurologically compelling.

---

## Table of Contents

- [Product Overview](#product-overview)
- [How It Works](#how-it-works)
- [The AI Engine — TRIBE v2](#the-ai-engine--tribe-v2)
- [Virality Score](#virality-score)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Flow](#data-flow)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Key Design Decisions](#key-design-decisions)
- [Current Unknowns](#current-unknowns)
- [Roadmap](#roadmap)

---

## Product Overview

**Target users:** Brand managers and digital marketing teams at mid-size companies.

**Core problem:** Brands spend heavily on content creation and distribution but currently rely on gut instinct or lagging metrics (views, likes) to judge content quality. There is no pre-publish signal for neurological engagement.

**Core solution:** Upload any video, image, or reel → Neureel runs it through TRIBE v2 → returns a brain activation map showing which cognitive regions fired → computes a virality score (0–100) → gives plain-English recommendations.

**Primary use case — Virality Reverse Engineering:**
1. Feed in known viral reels (e.g. top-performing brand ads)
2. Get their brain activation fingerprint
3. Use that fingerprint as a blueprint
4. Engineer new content to match or exceed the neurological profile

**Validation target:** 5 brand managers shown a working demo → 2–3 willing to pay ₹5,000–15,000/month → proceed to build.

---

## How It Works

```
User uploads video/image/reel
          │
          ▼
File stored in Cloudflare R2
          │
          ▼
Job created in NeonDB (status: PENDING)
          │
          ▼
FastAPI on Modal triggered (async)
          │
          ▼
TRIBE v2 runs inference on A10G GPU
(~1–3 minutes)
          │
          ▼
Activation map returned via webhook
          │
          ▼
Brain regions parsed + virality score computed
          │
          ▼
Job updated in DB (status: COMPLETED)
          │
          ▼
Frontend renders 3D brain visualization + score
```

---

## The AI Engine — TRIBE v2

**Full name:** Trimodal Brain Encoder v2
**Source:** Meta FAIR (Fundamental AI Research)
**License:** CC BY-NC (open source, non-commercial)
**HuggingFace:** `facebook/tribev2`
**Paper:** [A foundation model of vision, audition, and language for in-silico neuroscience](https://ai.meta.com/research/publications/a-foundation-model-of-vision-audition-and-language-for-in-silico-neuroscience/)

### What TRIBE v2 Does

TRIBE v2 is a foundation model trained on 1,000+ hours of fMRI brain recordings from 720 healthy volunteers exposed to real-world media — films, podcasts, videos, and text. Given any new stimulus (video, audio, image, text), it predicts the fMRI activation response across the entire cortical surface at high resolution.

### Key Capabilities

- **Trimodal:** Processes video, audio, and language simultaneously through a unified transformer architecture
- **High resolution:** Predicts activation across ~70,000 brain voxels (70x improvement over prior models)
- **Zero-shot:** Works on new individuals, new languages, new content — no retraining needed
- **In-silico experimentation:** Replaces expensive physical fMRI studies for hypothesis testing

### Internal Architecture (for AI agents)

TRIBE v2 uses three specialized encoders fused by a transformer:

| Modality | Encoder | What it captures |
|---|---|---|
| Video | V-JEPA2 | Visual features, motion, scene composition |
| Audio | Wav2Vec-BERT | Tone, speech, music, rhythm |
| Text | LLaMA 3.2 (3B) | Semantic meaning, narrative, language |

Output: A tensor of shape `[n_voxels]` representing predicted BOLD (blood-oxygen-level-dependent) fMRI signal intensity per voxel on the cortical surface.

### Inference Notes

- Requires CUDA GPU with 12GB+ VRAM minimum (A10G recommended)
- Cannot run on Mac (no CUDA) or consumer GPUs under 8GB VRAM
- Cold start on Modal: ~30s (model weights cached in Modal Volume)
- Inference time per video: ~1–3 minutes depending on length
- Model weights must be downloaded from HuggingFace (`facebook/tribev2`) — gated access required for the LLaMA 3.2 text encoder component

---

## Virality Score

Raw TRIBE v2 output (voxel activation values) is mapped to named brain regions using a standard neurological atlas (Destrieux or DK40). Named regions are then weighted by their correlation with content shareability and engagement:

```
Score (0–100) = weighted sum of regional activation values

Weights:
  Nucleus Accumbens   25%  — reward / dopamine response
  Amygdala            20%  — emotional arousal
  Visual Cortex       20%  — visual attention capture
  Prefrontal Cortex   15%  — decision making / intent
  Insula              10%  — social emotion / empathy
  Broca's Area        10%  — language processing / narrative
```

These weights are the core proprietary layer of Neureel — they will be refined over time by comparing model output against real-world virality data (view counts, share rates, engagement rates of known viral content).

Output labels derived from score:

| Score | Label |
|---|---|
| 80–100 | High viral potential |
| 60–79 | Strong engagement likely |
| 40–59 | Moderate — needs hook improvement |
| 20–39 | Low neurological engagement |
| 0–19 | Unlikely to retain attention |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
│                Next.js 14 (App Router) on Vercel                │
│          Upload UI → Job Status Polling → Brain Viewer          │
└─────────────────────────────┬───────────────────────────────────┘
                              │ tRPC over HTTPS
┌─────────────────────────────▼───────────────────────────────────┐
│                         WEB API LAYER                           │
│                    Next.js API Routes (Vercel)                  │
│                                                                 │
│   tRPC Routers:                    Plain Route Handlers:        │
│   - jobs (create, list, getById)   - /api/webhook/inference     │
│   - upload (R2 presigned URL)        (receives ML results)      │
│   - results (activation + score)                                │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────┐                 ┌─────────────────────┐
│    NeonDB        │                 │   Cloudflare R2     │
│   (PostgreSQL)   │                 │   (File Storage)    │
│                  │                 │                     │
│  - User          │                 │  - Raw video/image  │
│  - Job           │                 │    uploads          │
│  - JobStatus     │                 │  - No egress fees   │
│  - activationMap │                 │  - 10GB free        │
│  - brainRegions  │                 └──────────┬──────────┘
│  - viralityScore │                            │ signed URL
└──────────────────┘                 ┌──────────▼──────────┐
                                     │    Modal.com        │
                                     │                     │
                                     │  FastAPI endpoint   │
                                     │  + TRIBE v2 model   │
                                     │  on A10G GPU        │
                                     │                     │
                                     │  Serverless:        │
                                     │  only runs during   │
                                     │  active inference   │
                                     └──────────┬──────────┘
                                                │ POST webhook
                                                ▼
                                     /api/webhook/inference
                                     (results stored in DB)
```

---

## Tech Stack

### Web Layer (`apps/web/`)

| Concern | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| API | tRPC v11 |
| Auth | BetterAuth (Google OAuth) |
| ORM | Prisma |
| Database | NeonDB (serverless Postgres) |
| File Storage | Cloudflare R2 |
| Styling | Tailwind CSS + shadcn/ui |
| Brain Visualization | Niivue (WebGL, brain-specific viewer) |
| Deployment | Vercel (free tier) |

### ML Layer (`ml/`)

| Concern | Technology |
|---|---|
| Language | Python 3.11 |
| API Framework | FastAPI |
| GPU Cloud | Modal.com (serverless, A10G GPU) |
| Model | TRIBE v2 (`facebook/tribev2`) |
| Model Loading | HuggingFace Hub (`snapshot_download`) |
| Weight Caching | Modal Volume (persists across cold starts) |
| Request Validation | Pydantic v2 |
| Video Processing | MoviePy |
| Brain Atlas | Nilearn / nibabel |

---


## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Modal account (`pip install modal && modal token new`)
- NeonDB account
- Cloudflare account (R2)
- Google Cloud Console project (OAuth credentials)
- HuggingFace account + read token (for TRIBE v2 gated model)

### Web Layer

```bash
cd apps/web
pnpm install

# push prisma schema to NeonDB
pnpm db:migrate

# run dev server
pnpm dev
```

### ML Layer

```bash
cd ml
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# authenticate with Modal
modal token new

# test locally (CPU only, slow — for structure testing not inference)
modal run app.py

# deploy to Modal (GPU)
modal deploy app.py
# → outputs your FastAPI endpoint URL
# → paste this into MODAL_API_URL in apps/web/.env.local
```

## Deployment

### Web → Vercel

```bash
# in Vercel dashboard:
# Root Directory: apps/web
# Framework: Next.js
# Add all env vars from apps/web/.env.local
```

Or via CLI:
```bash
cd apps/web
npx vercel --prod
```

### ML → Modal

```bash
cd ml
modal deploy app.py
# Modal gives you a stable HTTPS URL for your FastAPI app
# This URL goes into MODAL_API_URL
```

### Auto Deploy ML on Git Push

See `.github/workflows/deploy-ml.yml` — triggers Modal deploy when `ml/**` changes on `main`. Requires `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` set in GitHub repo secrets.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repo structure | Monorepo | Single source of truth, easier for solo dev |
| Backend pattern | Modular monolith (not microservices) | Too early for microservices overhead |
| ML deployment | Modal.com serverless GPU | No infra management, pay-per-use, $30/mo free credit |
| ML API | FastAPI on Modal | Industry standard for ML APIs, Pydantic validation, auto docs |
| Inference pattern | Async + webhook | Inference takes 1–3 min, synchronous would timeout |
| Auth provider | Google OAuth only | Target users are brand teams living in Google Workspace |
| Auth library | BetterAuth | Modern, simple, Prisma adapter built-in |
| File storage | Cloudflare R2 | S3-compatible, no egress fees, 10GB free |
| Brain visualization | Niivue | Purpose-built WebGL brain viewer, React wrapper available |
| Frontend polling | tRPC query every 5s | Simple, no WebSocket complexity needed at MVP stage |
| Local ML | Not viable | TRIBE v2 needs 12GB+ VRAM, CUDA only — no Mac support |

---

## Current Unknowns

These must be resolved via Google Colab experimentation before ML code is finalized:

1. **TRIBE v2 exact inference API** — read `demo_utils.py` in the HuggingFace repo. Confirm: exact input format, preprocessing required (frame rate, audio sample rate, tokenization), and output tensor shape/format.

2. **Voxel → brain region mapping** — TRIBE v2 outputs activations on a cortical surface mesh. Need to confirm which atlas (Destrieux or DK40) aligns with TRIBE v2's surface space (fsaverage or MNI) and how to map voxel indices to named anatomical regions programmatically.

3. **Video preprocessing specs** — confirm exact frame rate, resolution, audio sampling rate, and clip length that TRIBE v2 expects. These go into `ml/inference/preprocess.py`.

4. **LLaMA 3.2 gated access** — the text encoder inside TRIBE v2 uses LLaMA 3.2-3B which requires HuggingFace gated model approval. Request access before starting ML work.

---

## For AI Agents Working on This Repo

- **Web layer** is TypeScript only. Never put Python or ML code in `apps/web/`.
- **ML layer** is Python only. Never put TypeScript or Next.js code in `ml/`.
- **The webhook route** (`/api/webhook/inference`) is a plain Next.js route handler, NOT a tRPC procedure. This is intentional — Modal calls it directly, not the browser.
- **Never store video/image files in NeonDB.** All media goes to Cloudflare R2. DB stores only the R2 key reference.
- **Job status transitions:** `PENDING → PROCESSING → COMPLETED | FAILED`. Never skip states.
- **The virality score weights** in `apps/web/src/lib/scoring.ts` are the core product differentiator. Do not hardcode them — they should be configurable so they can be tuned over time.
- **TRIBE v2 model weights** are cached in a Modal Volume named `tribe-v2-weights`. Never re-download on every inference call — always check if the volume path exists first.
- **Authentication:** All tRPC procedures except `health` are protected. Use the `protectedProcedure` helper, not `publicProcedure`, for any route that touches user data or triggers inference.
- **Webhook verification:** Always verify the `x-webhook-secret` header in `/api/webhook/inference` before processing. Reject with 401 if missing or mismatched.