# Neureel

Neuroscience-backed content intelligence for brand + marketing teams. Upload a
video or image, get a virality score plus a 3D brain activation map driven by
Meta's **TRIBE v2** foundation model — a transformer trained on 1,000+ hours
of fMRI to predict cortical response to video, audio, and text stimuli.

**Status:** end-to-end POC live at
[neureel.vercel.app](https://neureel.vercel.app). Sign in with Google, drop a
short MP4, get a real TRIBE v2 inference result with per-vertex activations on
the fsaverage5 cortical surface.

```
┌──────────────┐     ┌────────────────┐     ┌────────────────────┐
│  Browser     │───▶│  Next.js 16    │───▶│  Cloudflare R2     │
│  (Vercel)    │◀───│  Vercel + Neon │◀───│  (uploads + .npy)  │
└──────────────┘     └──────┬─────────┘     └────────────────────┘
                            │
                            │  POST /inference
                            ▼
                     ┌──────────────────────┐
                     │ Modal (A10G GPU)     │
                     │ @app.cls lifecycle   │
                     │ TRIBE v2 + encoders  │
                     └──────┬───────────────┘
                            │ POST webhook back
                            ▼
                     /api/webhook/inference
                     → Neon Postgres update
                     → UI polls + renders
```

## Repo layout

```
neureel/
├── apps/web/          Next.js 16 + tRPC + BetterAuth + Prisma + Tailwind
│                      See apps/web/README.md
├── ml/                Python + Modal + TRIBE v2 + nilearn
│                      See ml/README.md
├── docs/
│   └── atlas.md       fsaverage5 mesh / Destrieux parcellation details
├── .github/workflows/
│   └── deploy-ml.yml  Auto-deploy Modal app on push to ml/**
└── README.md          ← you are here
```

## Quick links

| Where | What |
|---|---|
| [`apps/web/README.md`](apps/web/README.md) | Web app architecture, env vars, local dev, playground features |
| [`ml/README.md`](ml/README.md) | Modal deployment, TRIBE v2 wiring, cold-start characteristics |
| [`docs/atlas.md`](docs/atlas.md) | Brain mesh bake pipeline + Destrieux proxy mapping |
| [`.github/workflows/deploy-ml.yml`](.github/workflows/deploy-ml.yml) | Modal CI deploy |

## Key product decisions

- **TRIBE v2 output is cortical-only** (~20k vertices on fsaverage5). The
  spec's tracked regions include subcortical areas (amygdala, nucleus
  accumbens) that TRIBE can't see directly — we map each of those to a
  cortical proxy (temporal pole, medial PFC) so the virality weights stay
  meaningful. See [`ml/inference/regions.py`](ml/inference/regions.py) →
  `CORTICAL_PROXY`.
- **Virality score is a weighted sum** of six tracked-region activations.
  Weights live in [`ml/inference/regions.py`](ml/inference/regions.py) and
  [`apps/web/src/lib/scoring.ts`](apps/web/src/lib/scoring.ts) as
  module-level constants — tunable without touching call sites.
- **Cold start is expensive, staying warm is cheap.** The GPU function uses
  `@app.cls` with `@modal.enter` so TRIBE loads once per container; a
  10-minute idle window (`scaledown_window=600`) keeps it warm between
  uploads without paying for idle GPU time.
- **Rich payload into Postgres.** Every completed job persists the full
  per-vertex activation map, a whole-brain time series, per-region
  time-series, peak moments, a full Destrieux breakdown, and a presigned R2
  URL for the raw `(n_timesteps, n_vertices)` tensor as a `.npy`. All in
  `Job.rawOutput JSON` — iterate the UI without migrating the schema.

## External services

- **Neon** — Postgres (use pooled URL for app runtime, direct URL for
  migrations)
- **Cloudflare R2** — uploaded media + raw inference artifacts
- **Modal** — A10G GPU for TRIBE v2 inference
- **HuggingFace** — gated access to `facebook/tribev2`, `meta-llama/Llama-3.2-3B`
- **Google Cloud** — OAuth credentials (BetterAuth Google provider)
- **Vercel** — hosts the Next.js app

## License / data

TRIBE v2 is under CC-BY-NC (research / non-commercial). Any production
commercialization of Neureel needs that relationship resolved with Meta FAIR.
