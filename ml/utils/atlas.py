"""Destrieux surface atlas loading + vertex→region mappings.

TRIBE v2 outputs predictions on fsaverage5 (~20k cortical vertices total,
10242 per hemisphere). We parcellate those vertices two ways:

1. `vertex_to_tracked`  — {vertex_idx: "v1"|"amygdala"|...} — feeds the
   virality-score pipeline. Subcortical spec regions map to cortical
   proxies per `regions.CORTICAL_PROXY`.

2. `vertex_to_destrieux` — {vertex_idx: (label_name, hemisphere)} — feeds
   the POC playground's "full Destrieux breakdown" so the UI can show
   activations for every parcel, not just the six tracked ones.

`prewarm_atlas()` is called from Modal's @modal.enter so the atlas download
+ label scan happens once per container, not per inference.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np

TRACKED_REGIONS = (
    "nucleus_accumbens",
    "amygdala",
    "v1",
    "dlpfc",
    "insula",
    "brocas_area",
)


def prewarm_atlas() -> None:
    """Force the atlas fetch + parsing so the first inference doesn't pay for it."""
    _load_destrieux_raw()
    _load_vertex_to_tracked()
    _load_vertex_to_destrieux()


@lru_cache(maxsize=1)
def _load_destrieux_raw() -> dict:
    """Fetch + parse the Destrieux surface atlas, healing over a corrupt cache.

    nilearn caches the atlas's `.annot` files under `$HOME/nilearn_data/…`.
    If a previous fetch was killed mid-download, the cached file is a
    truncated blob that `nibabel.freesurfer.io.read_annot` explodes on with
    a bogus "cannot reshape array of size 1084 into shape (...)" error.
    Nuking the cache dir and refetching fixes it. One retry is enough.
    """
    import shutil
    from pathlib import Path

    from nilearn import datasets

    def _fetch_and_parse() -> dict:
        atlas = datasets.fetch_atlas_surf_destrieux()
        labels = [
            s.decode("utf-8") if isinstance(s, (bytes, bytearray)) else str(s)
            for s in atlas["labels"]
        ]
        return {
            "labels": labels,
            "map_left": np.asarray(atlas["map_left"], dtype=np.int32),
            "map_right": np.asarray(atlas["map_right"], dtype=np.int32),
        }

    try:
        return _fetch_and_parse()
    except Exception as exc:
        # Wipe any cache dirs that might hold a corrupt .annot and retry once.
        print(f"[atlas] destrieux fetch/parse failed: {exc!r}; clearing cache and retrying")
        for candidate in (
            Path.home() / "nilearn_data" / "destrieux_surface",
            Path("/root/nilearn_data/destrieux_surface"),
        ):
            if candidate.exists():
                shutil.rmtree(candidate, ignore_errors=True)
                print(f"[atlas] removed {candidate}")
        return _fetch_and_parse()


@lru_cache(maxsize=1)
def _load_vertex_to_tracked() -> dict[int, str]:
    """Build {vertex_idx: tracked_region_name} using CORTICAL_PROXY patterns.

    Returns only vertices that map to one of our tracked regions; vertices
    in other Destrieux parcels are omitted.
    """
    from inference.regions import CORTICAL_PROXY

    raw = _load_destrieux_raw()
    labels: list[str] = raw["labels"]
    full_map = np.concatenate([raw["map_left"], raw["map_right"]])

    # label index → tracked region name
    label_idx_to_tracked: dict[int, str] = {}
    for idx, name in enumerate(labels):
        for tracked, patterns in CORTICAL_PROXY.items():
            if any(p in name for p in patterns):
                label_idx_to_tracked[idx] = tracked
                break

    out: dict[int, str] = {}
    matched_counts: dict[str, int] = {r: 0 for r in TRACKED_REGIONS}
    for vertex_idx, label_int in enumerate(full_map):
        tracked = label_idx_to_tracked.get(int(label_int))
        if tracked:
            out[vertex_idx] = tracked
            matched_counts[tracked] = matched_counts.get(tracked, 0) + 1

    # Visible in Modal logs so we notice if proxy substrings stop matching.
    print(f"[atlas] tracked vertex counts: {matched_counts}")
    print(f"[atlas] total mapped vertices: {len(out)} / {len(full_map)}")
    return out


@lru_cache(maxsize=1)
def _load_vertex_to_destrieux() -> dict[int, tuple[str, str]]:
    """Build {vertex_idx: (label_name, hemisphere)} for the full Destrieux
    parcellation. Skips Unknown / Medial_wall-style placeholder labels so
    the playground view doesn't get cluttered with them.
    """
    raw = _load_destrieux_raw()
    labels: list[str] = raw["labels"]
    map_left = raw["map_left"]
    map_right = raw["map_right"]

    skip = {"unknown", "medial_wall"}

    out: dict[int, tuple[str, str]] = {}
    for vertex_idx, label_int in enumerate(map_left):
        name = labels[int(label_int)]
        if name.lower() in skip:
            continue
        out[vertex_idx] = (name, "left")

    offset = len(map_left)
    for local_idx, label_int in enumerate(map_right):
        name = labels[int(label_int)]
        if name.lower() in skip:
            continue
        out[offset + local_idx] = (name, "right")

    return out


def load_vertex_to_tracked() -> dict[int, str]:
    return _load_vertex_to_tracked()


def load_vertex_to_destrieux() -> dict[int, tuple[str, str]]:
    return _load_vertex_to_destrieux()


def load_atlas_labels() -> dict[int, str]:
    """Back-compat shim for callers that only need the tracked mapping."""
    return _load_vertex_to_tracked()
