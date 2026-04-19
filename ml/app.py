"""Neureel ML service — Modal + FastAPI entrypoint.

POST /inference validates the shared secret, then spawns the GPU job via
Modal. The GPU work lives on a `@app.cls` (TribeInference) with an
@modal.enter lifecycle hook that loads TRIBE v2 once per container; the
container stays warm for `scaledown_window` seconds after the last call,
so repeat uploads during a session don't re-pay the cold-start cost.

Result payload is intentionally rich (POC mode) — we hand the web layer
time series, full Destrieux breakdown, peak moments, metadata, and an
optional R2-hosted raw .npy link so the UI can iterate on visualizations
without a redeploy.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import modal
from fastapi import FastAPI, Header, HTTPException

from schemas.requests import InferenceRequest

app = modal.App("neureel-ml")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "git+https://github.com/facebookresearch/tribev2.git",
        "nibabel",
        "nilearn",
        "scipy",
        "pandas",
        "boto3",
        "httpx",
        "fastapi",
        "pydantic",
        "pillow",
    )
    .run_commands("python -m spacy download en_core_web_sm")
    .env(
        {
            "HF_HOME": "/cache/huggingface",
            # NOTE: we intentionally do NOT set HF_HUB_OFFLINE here. Which
            # aux models TRIBE actually pulls depends on the input:
            # videos with spoken audio trigger LLaMA 3.2-3B for text
            # features, shorter/silent clips don't. Offline-mode caused
            # cache misses the first time a new modality showed up. We
            # rely on the Volume as a warm cache, falling back to HF with
            # the HF_TOKEN from `neureel-secrets` if something's missing.
        }
    )
    .add_local_python_source("schemas", "inference", "utils")
)

model_volume = modal.Volume.from_name(
    "neureel-tribe-v2-weights",
    create_if_missing=True,
)

web_app = FastAPI(title="Neureel ML API", version="0.2.0")


@web_app.get("/health")
async def health():
    return {"status": "ok", "model": "tribe-v2"}


@web_app.post("/inference")
async def inference(
    payload: InferenceRequest,
    x_webhook_secret: Optional[str] = Header(None, alias="x-webhook-secret"),
):
    expected = os.environ.get("WEBHOOK_SECRET")
    if not expected or x_webhook_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Fire-and-forget: Modal dispatches the GPU job, this returns immediately.
    TribeInference().run.spawn(payload.model_dump())
    return {"status": "accepted", "job_id": payload.job_id}


@app.cls(
    gpu="A10G",
    image=image,
    volumes={"/cache": model_volume},
    timeout=1200,
    secrets=[modal.Secret.from_name("neureel-secrets")],
    scaledown_window=600,  # keep container warm 10 min after last call
    max_containers=1,
)
class TribeInference:
    """Holds the loaded TRIBE v2 model + Destrieux atlas in memory across
    calls within the 10-minute warm window."""

    @modal.enter()
    def load(self) -> None:
        from inference.tribe import load_model
        from utils.atlas import prewarm_atlas

        print("[TribeInference] @enter: loading TRIBE v2 weights...")
        self.model = load_model(Path("/cache/tribev2"))
        print("[TribeInference] @enter: prewarming Destrieux atlas...")
        prewarm_atlas()
        print("[TribeInference] @enter: ready")

    @modal.method()
    def run(self, payload: dict) -> None:
        """Download input → inference → derive features → POST webhook."""
        import sys
        import time
        import httpx

        from inference.preprocess import download_file, image_to_video
        from inference.regions import (
            REGION_FUNCTIONS,
            activation_map_to_regions,
            compute_virality_score,
            destrieux_full_breakdown,
            find_peak_moments,
            tracked_region_timeseries,
        )
        from inference.tribe import normalize, run_inference
        from utils.atlas import load_vertex_to_destrieux, load_vertex_to_tracked
        from utils import raw_upload

        job_id = payload["job_id"]
        file_url = payload["file_url"]
        file_type = payload["file_type"]
        webhook_url = payload["webhook_url"]

        def _log(msg: str) -> None:
            print(f"[run:{job_id}] {msg}", flush=True)
            sys.stdout.flush()

        started = time.monotonic()
        _log(f"START file_type={file_type} webhook={webhook_url}")

        try:
            # --- Stage input -------------------------------------------------
            if file_type == "video":
                video_path = download_file(file_url, ".mp4")
            else:
                img_path = download_file(file_url, ".jpg")
                video_path = image_to_video(img_path)
            _log(f"staged input at {video_path}")

            # --- Real inference ---------------------------------------------
            t0 = time.monotonic()
            out = run_inference(self.model, str(video_path))
            preds = out.preds  # (T, V) float32
            _log(
                f"inference done in {time.monotonic() - t0:.1f}s, preds.shape={preds.shape}"
            )
            if preds.ndim != 2:
                raise RuntimeError(
                    f"Unexpected preds shape {preds.shape}; expected 2D (T, V)"
                )
            n_timesteps, n_vertices = preds.shape

            # --- Atlas lookups (cached from @enter) ------------------------
            vertex_to_tracked = load_vertex_to_tracked()
            vertex_to_destrieux = load_vertex_to_destrieux()
            _log(
                f"atlas: tracked={len(vertex_to_tracked)} destrieux={len(vertex_to_destrieux)}"
            )

            # --- Core virality path (unchanged contract) -------------------
            mean_per_vertex = normalize(preds.mean(axis=0))
            tracked_activations = activation_map_to_regions(
                mean_per_vertex, vertex_to_tracked
            )
            virality_score = compute_virality_score(tracked_activations)
            _log(f"virality_score={virality_score}")

            brain_regions = [
                {
                    "name": region,
                    "activation": round(float(act), 4),
                    "function": REGION_FUNCTIONS.get(region, "Brain Region"),
                }
                for region, act in sorted(
                    tracked_activations.items(),
                    key=lambda kv: kv[1],
                    reverse=True,
                )
            ]

            # --- Richer POC payload ----------------------------------------
            whole_brain_mean = [
                round(float(v), 6) for v in preds.mean(axis=1).tolist()
            ]
            tracked_series = tracked_region_timeseries(preds, vertex_to_tracked)
            _log(f"derived whole_brain_mean(len={len(whole_brain_mean)}) and tracked_series")
            destrieux_full = destrieux_full_breakdown(
                mean_per_vertex, vertex_to_destrieux
            )
            _log(f"destrieux_full rows={len(destrieux_full)}")
            peaks = find_peak_moments(
                preds, vertex_to_tracked, k=5, timestep_seconds=1.0
            )
            _log(f"peaks={len(peaks)}")

            raw_npy_url = None
            if os.environ.get("UPLOAD_RAW_NPY", "1") == "1":
                t_up = time.monotonic()
                raw_npy_url = raw_upload.upload_npy(preds, job_id=job_id)
                _log(
                    f"raw_upload -> {raw_npy_url!r} in {time.monotonic() - t_up:.1f}s"
                )

            elapsed = time.monotonic() - started

            metadata = {
                "model": "tribe-v2",
                "n_vertices": int(n_vertices),
                "n_timesteps": int(n_timesteps),
                "timestep_seconds": 1.0,
                "video_duration_seconds": round(n_timesteps * 1.0, 2),
                "inference_duration_seconds": round(elapsed, 2),
                "n_tracked_vertices": len(vertex_to_tracked),
                "n_destrieux_rows": len(destrieux_full),
            }

            result = {
                # Existing webhook contract (shape unchanged)
                "job_id": job_id,
                "status": "completed",
                "virality_score": virality_score,
                "brain_regions": brain_regions,
                "activation_map": mean_per_vertex.tolist(),
                "note": None,
                # POC-mode additions — persisted into Job.rawOutput
                "timeseries": {
                    "whole_brain_mean": whole_brain_mean,
                    "tracked_region_series": tracked_series,
                },
                "destrieux_full": destrieux_full,
                "peak_moments": peaks,
                "raw_npy_url": raw_npy_url,
                "metadata": metadata,
            }
            _log(f"result assembled, about to POST webhook")

        except Exception as exc:
            import traceback

            traceback.print_exc()
            sys.stderr.flush()
            _log(f"EXCEPTION in inference path: {type(exc).__name__}: {exc}")
            result = {
                "job_id": job_id,
                "status": "failed",
                "error": f"{type(exc).__name__}: {exc}",
            }

        try:
            t_wh = time.monotonic()
            resp = httpx.post(
                webhook_url,
                json=result,
                headers={"x-webhook-secret": os.environ["WEBHOOK_SECRET"]},
                timeout=httpx.Timeout(30.0, connect=10.0),
                # Follow http→https (308) or other redirects so a misconfigured
                # WEBHOOK_BASE_URL doesn't silently drop results.
                follow_redirects=True,
            )
            _log(
                f"webhook POST -> {resp.status_code} in {time.monotonic() - t_wh:.1f}s"
            )
        except Exception as exc:
            _log(f"webhook post failed: {type(exc).__name__}: {exc}")


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("neureel-secrets")],
)
@modal.asgi_app()
def fastapi_app():
    return web_app
