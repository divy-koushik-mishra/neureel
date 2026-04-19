# Neureel ML

Modal-hosted Python service that runs Meta's **TRIBE v2** on an A10G GPU and
posts per-vertex cortical activations back to the Neureel web app via a
signed webhook. Part of the [`neureel`](../README.md) monorepo.

## Architecture

```
Next.js                                                             Next.js
/api/jobs.triggerInference                              /api/webhook/inference
          │                                                             ▲
          │ POST ${MODAL_API_URL}/inference                             │
          │  {job_id, file_url, file_type, webhook_url}                 │
          ▼                                                             │
┌────────────────────────────────┐                                      │
│  fastapi_app (Modal ASGI)      │                                      │
│  verifies x-webhook-secret     │                                      │
│  TribeInference().run.spawn()  │                                      │
└──────┬─────────────────────────┘                                      │
       │                                                                │
       ▼                                                                │
┌────────────────────────────────┐      modal.Volume                    │
│  @app.cls TribeInference       │  ┌───────────────────────┐           │
│  gpu="A10G"                    │  │ /cache/huggingface    │           │
│  scaledown_window=600 (10min)  │─▶│ /cache/tribev2        │           │
│  max_containers=1              │  │ (all weights cached)  │           │
│                                │  └───────────────────────┘           │
│  @modal.enter → load TRIBE     │                                      │
│                 prewarm atlas  │                                      │
│  @modal.method run(payload)    │                                      │
│     download input from R2     │                                      │
│     model.predict(events=df)   │                                      │
│     parcellate + score         │                                      │
│     upload preds.npy to R2     │                                      │
│     POST result to webhook ────┼──────────────────────────────────────┘
└────────────────────────────────┘
```

### Why this shape

- **`@app.cls` + `@modal.enter`**: TRIBE v2 + its encoders total ~10 GB of
  weights (LLaMA 3.2-3B, V-JEPA2-G, Wav2Vec-BERT, TRIBE ckpt). Loading that on
  every inference would be unusable. The class lifecycle loads once per
  container, then serves many calls.
- **`scaledown_window=600`**: 10 minutes of idle before Modal kills the
  container. First call after a cold start pays the load time (~30–60 s once
  weights are cached in the Volume; ~6–10 min on the very first run that has
  to download from HuggingFace). Calls within the window are warm.
- **`max_containers=1`**: no parallel cold starts during dev. Bump when real
  concurrency is needed.
- **`HF_HUB_OFFLINE=1` / `TRANSFORMERS_OFFLINE=1`** (baked into the image):
  after the first run caches everything in the Volume, subsequent runs never
  hit HuggingFace — a flaky HF 401 or rate-limit can no longer sink a job.
  If you ever need to pull a new model, temporarily unset and redeploy.

## TRIBE v2 wiring ([`inference/tribe.py`](inference/tribe.py))

Real API, confirmed against `facebook/tribev2` — installed from the upstream
GitHub repo:

```python
from tribev2 import TribeModel

model = TribeModel.from_pretrained(
    "facebook/tribev2",
    cache_folder="/cache/tribev2",
    device="auto",
)

events_df = model.get_events_dataframe(video_path="/tmp/input.mp4")
preds, segments = model.predict(events=events_df)
# preds.shape == (n_timesteps, n_vertices)   fsaverage5 cortical surface
```

TRIBE handles its own video/audio decoding internally via `moviepy` +
`ffmpeg`, so [`inference/preprocess.py`](inference/preprocess.py) only does
two things: HTTPS download of the R2 signed URL, and an `ffmpeg`-based
still-image → 1-second MP4 path for JPG/PNG/WebP inputs.

## Atlas mapping ([`utils/atlas.py`](utils/atlas.py))

Two cached vertex-level lookups, built once per container (`prewarm_atlas()`
called from `@modal.enter`):

- **`vertex_to_tracked`**: `{vertex_idx: "v1"|"amygdala"|...}` — the 6 spec
  regions that feed the virality score. Subcortical spec regions (amygdala,
  nucleus accumbens) are **proxied** to cortical neighbors via
  [`inference/regions.py`](inference/regions.py) → `CORTICAL_PROXY`, since
  TRIBE only predicts on the cortical surface. See
  [`docs/atlas.md`](../docs/atlas.md) for the full proxy table and reasoning.
- **`vertex_to_destrieux`**: `{vertex_idx: (label_name, "left"|"right")}` —
  all 74 Destrieux cortical labels, used for the web app's "full Destrieux
  breakdown" drill-down.

The Destrieux atlas is fetched via `nilearn.datasets.fetch_atlas_surf_destrieux()`
on first call per container and cached on local disk.

## Result payload

The webhook body includes the existing contract fields (`virality_score`,
`brain_regions`, `activation_map`, `note`, `error`) plus a bundle of extras
the web app persists into `Job.rawOutput` for the Playground UI:

| Field | Shape | Purpose |
|---|---|---|
| `timeseries.whole_brain_mean` | `float[n_timesteps]` | Line chart of activation over time |
| `timeseries.tracked_region_series` | `{v1: float[T], ...}` | Region × time heatmap |
| `destrieux_full` | `[{name, hemisphere, activation, n_vertices}, ...]` | ~148 region drill-down |
| `peak_moments` | `[{timestep, time_seconds, activation, top_regions}, ...]` | Top-5 dominant moments |
| `raw_npy_url` | `string \| null` | 7-day presigned R2 link to the full `(T, V)` `.npy` tensor |
| `metadata` | `{model, n_vertices, n_timesteps, timestep_seconds, duration, inference_duration, ...}` | Audit + UI labels |

Total JSON payload is ~250 KB for a typical 30-second video — well under
Postgres `Json` practical limits.

## Raw artifact upload ([`utils/raw_upload.py`](utils/raw_upload.py))

After inference, the full `(n_timesteps, n_vertices)` float32 tensor is
saved as a `.npy` and PUT to R2 under `raw/<job_id>.npy`. Returns a
7-day presigned GET URL that flows all the way to the browser's
"Download raw .npy" link. Soft-fails (logs + returns `null`) if R2 creds
are missing — inference still completes.

R2 is addressed via `boto3` with `request_checksum_calculation="when_required"`
so AWS SDK v4's new checksum headers don't break preflight (R2's rough edge).

## Module tour

```
ml/
├── app.py                    Modal app: image, Volume, FastAPI, TribeInference class
├── requirements.txt          tribev2 from GitHub + nilearn + boto3 + fastapi + ...
├── .env.example              HF_TOKEN, WEBHOOK_SECRET (managed via Modal secret)
├── inference/
│   ├── tribe.py              load_model + run_inference (returns InferenceOutput)
│   ├── preprocess.py         download_file + image_to_video (ffmpeg loop)
│   └── regions.py            VIRALITY_WEIGHTS, REGION_FUNCTIONS, CORTICAL_PROXY,
│                             activation_map_to_regions, compute_virality_score,
│                             tracked_region_timeseries, destrieux_full_breakdown,
│                             find_peak_moments
├── schemas/
│   └── requests.py           Pydantic InferenceRequest, BrainRegion, InferenceResult
├── utils/
│   ├── atlas.py              Destrieux + CORTICAL_PROXY vertex maps (cached)
│   └── raw_upload.py         .npy → R2 (boto3, R2-safe checksum config)
└── scripts/
    └── bake_mesh.py          One-off: bake fsaverage5 mesh into apps/web/public/atlas/
```

## Prerequisites

- Python 3.11
- Modal CLI (`pip install modal` + `modal setup`)
- HuggingFace access accepted on **both**:
  - [`facebook/tribev2`](https://huggingface.co/facebook/tribev2) (the foundation model, gated)
  - [`meta-llama/Llama-3.2-3B`](https://huggingface.co/meta-llama/Llama-3.2-3B) (text encoder, gated)

## Secrets

Single Modal secret named `neureel-secrets`:

```bash
modal secret create neureel-secrets \
  HF_TOKEN=hf_...                                   \
  WEBHOOK_SECRET=$(openssl rand -base64 32)         \
  R2_ACCOUNT_ID=...                                 \
  R2_ACCESS_KEY_ID=...                              \
  R2_SECRET_ACCESS_KEY=...                          \
  R2_BUCKET_NAME=neureel-dev                        \
  UPLOAD_RAW_NPY=1
```

`WEBHOOK_SECRET` here must match `MODAL_WEBHOOK_SECRET` on the Next.js side —
both ends of the round trip verify the same header.

## Dev loop

```bash
cd ml
pip install modal

# Live dev container, ephemeral URL:
modal serve app.py

# Deploy to prod:
modal deploy app.py
# → https://<workspace>--neureel-ml-fastapi-app.modal.run
```

Put the deploy URL into `MODAL_API_URL` on the Next.js side.

### Sanity check

```bash
curl https://<workspace>--neureel-ml-fastapi-app.modal.run/health
# {"status":"ok","model":"tribe-v2"}
```

## Cold-start timeline

| State | Duration |
|---|---|
| Very first run (empty Volume, downloads ~10 GB from HF) | 6–10 min |
| Cold start after Volume is populated (weights load from Volume) | 30–90 s |
| Warm call (within 10 min of previous) | inference only, typically 30–90 s per short video |
| Scale-to-zero | after 10 min idle |

## Failure modes + what to watch

- **HF gated access**: first run fails at download if your HF token hasn't
  accepted the LLaMA 3.2-3B or TRIBE v2 license. Fix: accept on the HF repo
  pages. Offline mode won't save you here because the download hasn't
  happened yet.
- **GPU OOM**: A10G (24 GB) fits all TRIBE encoders with room to spare. If
  OOM shows up, check container Metrics and consider `gpu="A100-40GB"`.
- **Webhook 308**: if the web app was deployed with `WEBHOOK_BASE_URL=http://...`
  (no HTTPS), Vercel responds with a 308. `httpx.post(..., follow_redirects=True)`
  handles that cleanly now, but fix the env var anyway.
- **Webhook write refused**: payload hits `/api/webhook/inference` but
  Prisma rejects an unknown column. Happens right after a schema change if
  Vercel hasn't redeployed. Trigger a redeploy.

## Deploy automation

[`.github/workflows/deploy-ml.yml`](../.github/workflows/deploy-ml.yml) runs
`modal deploy app.py` on every push to `main` that touches `ml/**`. Needs
`MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` as repo secrets.

## Mesh baking ([`scripts/bake_mesh.py`](scripts/bake_mesh.py))

Run once locally (not on Modal) whenever the web brain viewer needs a
refreshed asset:

```bash
pip install nibabel nilearn      # if not already
python ml/scripts/bake_mesh.py
# writes apps/web/public/atlas/fsaverage5.bin + fsaverage5.meta.json
```

Packs: LH and RH pial + inflated vertices, shared face topology, sulcal
depth per vertex, Destrieux label index per vertex, and all 76 label
names into a compact binary (~1 MB total). Vertex ordering lines up 1-to-1
with TRIBE's predicted `activation_map`, so `activation_map[i]` lights the
same cortical point on either surface. Full details:
[`../docs/atlas.md`](../docs/atlas.md).
