"""Voxel / vertex activation → named brain regions + weighted virality score.

Weights are intentionally module-level constants so they can be tuned over
time without touching call sites. Keep `VIRALITY_WEIGHTS` here in sync with
`apps/web/src/lib/scoring.ts`.

TRIBE v2 outputs cortical-surface predictions on fsaverage5 (~20k vertices).
Our spec's "tracked regions" include subcortical areas that TRIBE can't see
directly, so `CORTICAL_PROXY` maps each tracked region to a substring of
Destrieux cortical labels — subcortical ones use the closest cortical
neighbor as a proxy. This keeps the product UI / copy stable while being
honest that TRIBE outputs are cortical-only.
"""
from __future__ import annotations

from typing import Iterable

import numpy as np

VIRALITY_WEIGHTS: dict[str, float] = {
    "nucleus_accumbens": 0.25,
    "amygdala": 0.20,
    "v1": 0.20,
    "dlpfc": 0.15,
    "insula": 0.10,
    "brocas_area": 0.10,
}

REGION_FUNCTIONS: dict[str, str] = {
    "nucleus_accumbens": "Reward & Dopamine Response",
    "amygdala": "Emotional Arousal",
    "v1": "Visual Attention",
    "dlpfc": "Decision Making",
    "insula": "Social Emotion & Empathy",
    "brocas_area": "Language & Narrative Processing",
    "hippocampus": "Memory Encoding",
    "motor_cortex": "Action Simulation",
    "tpj": "Theory of Mind & Social Cognition",
}

# Destrieux label substrings that define each tracked region. Subcortical
# entries (nucleus_accumbens, amygdala) use cortical proxies since TRIBE
# predicts on the fsaverage5 surface.
CORTICAL_PROXY: dict[str, tuple[str, ...]] = {
    "v1": ("S_calcarine", "G_oc-temp_med-Lingual"),
    "dlpfc": ("G_front_sup", "G_front_middle"),
    "brocas_area": ("G_front_inf-Triangul", "G_front_inf-Opercular"),
    "insula": ("G_insular_short", "G_Ins_lg_and_S_cent_ins"),
    # Subcortical → cortical proxies (not anatomically exact).
    "amygdala": ("Pole_temporal", "G_temporal_inf"),  # temporal pole proxy
    "nucleus_accumbens": ("G_and_S_cingul-Ant", "G_front_middle"),  # mPFC reward proxy
}


def activation_map_to_regions(
    activation_map: np.ndarray,
    vertex_to_region: dict[int, str],
) -> dict[str, float]:
    """Aggregate per-vertex activations by region name (mean) then min-max
    normalize the *set of region means* to [0, 1] for downstream scoring.

    Accepts either a voxel index map (legacy) or a vertex index map — it's
    just `{idx: name}` either way.
    """
    buckets: dict[str, list[float]] = {}
    n = len(activation_map)
    for idx, name in vertex_to_region.items():
        if idx >= n:
            continue
        buckets.setdefault(name, []).append(float(activation_map[idx]))

    means: dict[str, float] = {
        r: float(np.mean(v)) for r, v in buckets.items() if v
    }
    if not means:
        return means

    lo, hi = min(means.values()), max(means.values())
    span = hi - lo or 1.0
    return {k: (v - lo) / span for k, v in means.items()}


def compute_virality_score(region_activations: dict[str, float]) -> float:
    score = 0.0
    for region, weight in VIRALITY_WEIGHTS.items():
        score += region_activations.get(region, 0.0) * weight
    return round(score * 100, 1)


# ---------------------------------------------------------------------------
# Per-timestep / full-Destrieux helpers (POC playground support)
# ---------------------------------------------------------------------------


def _region_vertex_indices(
    vertex_to_region: dict[int, str], region: str
) -> np.ndarray:
    return np.asarray(
        [idx for idx, name in vertex_to_region.items() if name == region],
        dtype=np.int64,
    )


def tracked_region_timeseries(
    preds: np.ndarray,
    vertex_to_tracked: dict[int, str],
    regions: Iterable[str] | None = None,
) -> dict[str, list[float]]:
    """Return per-timestep mean activation for each tracked region.

    `preds` is (T, V). Output: {region_name: list[float] of length T}.
    """
    if preds.ndim != 2:
        return {}
    target_regions = list(regions) if regions is not None else list(VIRALITY_WEIGHTS.keys())
    out: dict[str, list[float]] = {}
    for region in target_regions:
        idxs = _region_vertex_indices(vertex_to_tracked, region)
        if idxs.size == 0:
            out[region] = [0.0] * preds.shape[0]
            continue
        series = preds[:, idxs].mean(axis=1)
        out[region] = [round(float(v), 6) for v in series.tolist()]
    return out


def destrieux_full_breakdown(
    mean_per_vertex: np.ndarray,
    vertex_to_destrieux: dict[int, tuple[str, str]],
) -> list[dict]:
    """Mean-over-time activation aggregated by every Destrieux label that has
    any vertices. Returns one row per (label, hemisphere) pair.

    `vertex_to_destrieux[idx]` is `(label_name, hemisphere)` — both strings.
    """
    buckets: dict[tuple[str, str], list[float]] = {}
    n = len(mean_per_vertex)
    for idx, (label, hemi) in vertex_to_destrieux.items():
        if idx >= n:
            continue
        buckets.setdefault((label, hemi), []).append(float(mean_per_vertex[idx]))

    rows = [
        {
            "name": label,
            "hemisphere": hemi,
            "activation": round(float(np.mean(vals)), 6),
            "n_vertices": len(vals),
        }
        for (label, hemi), vals in buckets.items()
        if vals
    ]
    rows.sort(key=lambda r: r["activation"], reverse=True)
    return rows


def find_peak_moments(
    preds: np.ndarray,
    vertex_to_tracked: dict[int, str],
    k: int = 5,
    timestep_seconds: float = 1.0,
) -> list[dict]:
    """Top-K timesteps by whole-brain mean activation, each annotated with
    the three tracked regions that fired hardest in that timestep.
    """
    if preds.ndim != 2 or preds.shape[0] == 0:
        return []

    whole_brain = preds.mean(axis=1)
    k = min(k, len(whole_brain))
    top_idxs = np.argsort(whole_brain)[::-1][:k]

    # Pre-compute tracked-region series once so we can look up per-timestep
    # activations cheaply.
    tracked_series = tracked_region_timeseries(preds, vertex_to_tracked)

    out: list[dict] = []
    for t in top_idxs:
        t_int = int(t)
        per_region = {
            region: series[t_int]
            for region, series in tracked_series.items()
            if t_int < len(series)
        }
        top_regions = sorted(
            per_region.items(), key=lambda kv: kv[1], reverse=True
        )[:3]
        out.append(
            {
                "timestep": t_int,
                "time_seconds": round(t_int * timestep_seconds, 3),
                "activation": round(float(whole_brain[t_int]), 6),
                "top_regions": [
                    {"name": r, "activation": round(float(a), 6)}
                    for r, a in top_regions
                ],
            }
        )
    return out
