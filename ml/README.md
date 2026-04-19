# Neureel ML

Python + Modal service that runs Meta's TRIBE v2 model on GPU and posts voxel
activations back to the Next.js app.

## Architecture

```
Next.js  ──POST /inference──▶  Modal FastAPI  ──.spawn()──▶  GPU function
                                                                   │
                                                              [TRIBE v2]
                                                                   │
Next.js  ◀──POST webhook_url──────────────────────────────────────┘
```

The HTTP request to `/inference` returns immediately after the GPU job is
spawned. The GPU worker always POSTs a result (success or failure) back to
`webhook_url` with the `x-webhook-secret` header.

## Prerequisites

- Python 3.11
- Modal CLI (`pip install modal` + `modal setup`)
- HuggingFace token with access to `facebook/tribev2` (gated model)

## Setup

```bash
pip install -r requirements.txt

# Create the Modal secret used by both FastAPI and the GPU function
modal secret create neureel-secrets \
  HF_TOKEN=hf_... \
  WEBHOOK_SECRET=$(openssl rand -base64 32)
```

`WEBHOOK_SECRET` must match `MODAL_WEBHOOK_SECRET` in `apps/web/.env` — both
sides of the round trip verify the same header.

## Local dev

```bash
modal serve app.py
```

This spins up an ephemeral dev deployment. Modal prints a URL like
`https://<workspace>--neureel-ml-fastapi-app-dev.modal.run`. Set that as
`MODAL_API_URL` in `apps/web/.env`.

Health check:

```bash
curl https://<url>/health
# → {"status":"ok","model":"tribe-v2"}
```

## Deploy

```bash
modal deploy app.py
```

The GitHub Action at `.github/workflows/deploy-ml.yml` runs this on every push
to `main` that touches `ml/**`.

## Known placeholder

`inference/tribe.py` contains a hypothesized API surface
(`TribeModel.from_pretrained` / `.predict(...)`) that must be replaced with
the real one from the HuggingFace repo's `demo_utils.py` before the pipeline
produces meaningful output. Until then, the worker will fail gracefully and
the failure will surface on the results page in the web app.

The atlas cross-walk in `utils/atlas.py` is also a placeholder (even stripes
across ~70k voxels). See `docs/atlas.md` for the follow-up plan.
