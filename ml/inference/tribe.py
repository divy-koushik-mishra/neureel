"""TRIBE v2 wrapper — real implementation.

Per README (facebook/tribev2):
    from tribev2 import TribeModel
    model = TribeModel.from_pretrained(
        "facebook/tribev2",
        cache_folder=...,
        device="auto",
    )
    events_df = model.get_events_dataframe(video_path="...")
    preds, segments = model.predict(events=events_df)
    # preds.shape == (n_timesteps, n_vertices)  fsaverage5 surface

This module keeps TRIBE-specific knowledge in one place. Aggregation,
scoring, atlas mapping, and payload shaping live elsewhere (regions.py,
atlas.py, app.py).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, NamedTuple

import numpy as np


class InferenceOutput(NamedTuple):
    """Raw output from TribeModel.predict kept together so downstream code
    can derive temporal, region, and peak-moment features without reloading
    the model."""

    preds: np.ndarray  # (n_timesteps, n_vertices), float32
    segments: list  # TRIBE's per-segment metadata (shape TBD from runtime)
    events_df: Any  # pandas.DataFrame; typed as Any to avoid hard pandas dep here


def load_model(cache_folder: Path) -> Any:
    """Load the TRIBE v2 model into GPU memory. Call once per container."""
    from tribev2 import TribeModel

    cache_folder.mkdir(parents=True, exist_ok=True)
    model = TribeModel.from_pretrained(
        "facebook/tribev2",
        cache_folder=str(cache_folder),
        device="auto",
    )
    return model


def run_inference(model: Any, video_path: str) -> InferenceOutput:
    """Produce raw spatiotemporal predictions for a video file."""
    events_df = model.get_events_dataframe(video_path=video_path)
    preds, segments = model.predict(events=events_df)
    return InferenceOutput(
        preds=np.asarray(preds, dtype=np.float32),
        segments=list(segments) if segments is not None else [],
        events_df=events_df,
    )


def normalize(vec: np.ndarray) -> np.ndarray:
    """Min-max normalize to [0, 1]. Safe for constant arrays."""
    lo, hi = float(vec.min()), float(vec.max())
    span = hi - lo or 1.0
    return ((vec - lo) / span).astype(np.float32)


def is_demo_model(_model: Any) -> bool:
    return False
