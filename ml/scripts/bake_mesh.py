"""Bake fsaverage5 surface assets for the web brain viewer.

Writes a single compact binary + a metadata JSON that together give the
front-end everything it needs to render a real anatomical brain with
hover-aware region labels and sulc-based shading:

  apps/web/public/atlas/fsaverage5.bin       (L+R inflated verts/faces + sulc + parcellation)
  apps/web/public/atlas/fsaverage5.meta.json (layout offsets + label names + region index)

Vertex ordering matches TRIBE v2's prediction space (fsaverage5, ~10242 per
hemi, 20484 total), so `activation_map[i]` lines up 1:1 with vertex `i`.
"""
from __future__ import annotations

import json
from pathlib import Path

import nibabel as nib
import numpy as np
from nilearn import datasets

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps" / "web" / "public" / "atlas"


def _load_surf(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Return (vertices (V,3) float32, faces (F,3) uint32) for a FreeSurfer/GIFTI surface."""
    try:
        v, f = nib.freesurfer.io.read_geometry(str(path))
        return np.asarray(v, dtype=np.float32), np.asarray(f, dtype=np.uint32)
    except Exception:
        pass
    g = nib.load(str(path))
    return (
        np.asarray(g.darrays[0].data, dtype=np.float32),
        np.asarray(g.darrays[1].data, dtype=np.uint32),
    )


def _load_scalar(path: str) -> np.ndarray:
    # nilearn ships fsaverage5 sulc as GIFTI; FreeSurfer's morph reader
    # happily but incorrectly decodes the same file, so GIFTI first.
    try:
        g = nib.load(str(path))
        return np.asarray(g.darrays[0].data, dtype=np.float32)
    except Exception:
        return np.asarray(
            nib.freesurfer.io.read_morph_data(str(path)), dtype=np.float32
        )


def main() -> None:
    print("[bake] fetching fsaverage5 surface + sulc…")
    fs = datasets.fetch_surf_fsaverage(mesh="fsaverage5")

    # We ship BOTH surfaces so the UI can toggle between anatomical pial
    # (real gyri/sulci visible in 3D) and inflated (easier to read regions).
    lh_infl_v, lh_infl_f = _load_surf(fs["infl_left"])
    rh_infl_v, rh_infl_f = _load_surf(fs["infl_right"])
    lh_pial_v, lh_pial_f = _load_surf(fs["pial_left"])
    rh_pial_v, rh_pial_f = _load_surf(fs["pial_right"])

    # Pial and inflated share the same vertex ordering + face topology, so
    # activation_map[i] maps the same vertex on either surface. Safety check:
    assert lh_infl_f.shape == lh_pial_f.shape, "LH face mismatch infl vs pial"
    assert rh_infl_f.shape == rh_pial_f.shape, "RH face mismatch infl vs pial"

    # Sulc = sulcal depth per vertex. Signed; positive = sulci (valleys).
    lh_sulc = _load_scalar(fs["sulc_left"])
    rh_sulc = _load_scalar(fs["sulc_right"])

    # Center each hemisphere at origin so the viewer can rotate freely in place.
    def _center(v: np.ndarray) -> np.ndarray:
        return v - v.mean(axis=0)

    lh_infl_v = _center(lh_infl_v)
    rh_infl_v = _center(rh_infl_v)
    lh_pial_v = _center(lh_pial_v)
    rh_pial_v = _center(rh_pial_v)

    # Keep the two surfaces visually commensurate. Pial is physically smaller
    # than inflated; scale inflated so both meshes display at similar size.
    infl_radius = float(np.linalg.norm(lh_infl_v, axis=1).mean())
    pial_radius = float(np.linalg.norm(lh_pial_v, axis=1).mean())
    scale = pial_radius / (infl_radius or 1.0)
    lh_infl_v = lh_infl_v * scale
    rh_infl_v = rh_infl_v * scale
    # keep orientation convention: faces from freesurfer are fine as-is.

    print("[bake] fetching Destrieux parcellation…")
    destrieux = datasets.fetch_atlas_surf_destrieux()
    labels_raw: list = list(destrieux["labels"])
    labels: list[str] = [
        (s.decode("utf-8") if isinstance(s, (bytes, bytearray)) else str(s))
        for s in labels_raw
    ]
    lh_labels = np.asarray(destrieux["map_left"], dtype=np.uint16)
    rh_labels = np.asarray(destrieux["map_right"], dtype=np.uint16)

    # Sanity
    assert len(lh_infl_v) == len(lh_pial_v) == len(lh_sulc) == len(lh_labels), (
        f"LH mismatch infl={len(lh_infl_v)} pial={len(lh_pial_v)} "
        f"s={len(lh_sulc)} lbl={len(lh_labels)}"
    )
    assert len(rh_infl_v) == len(rh_pial_v) == len(rh_sulc) == len(rh_labels), (
        f"RH mismatch infl={len(rh_infl_v)} pial={len(rh_pial_v)} "
        f"s={len(rh_sulc)} lbl={len(rh_labels)}"
    )

    print(
        f"[bake] LH verts={len(lh_infl_v)} faces={len(lh_infl_f)} / "
        f"RH verts={len(rh_infl_v)} faces={len(rh_infl_f)} (same topology for pial)"
    )
    print(f"[bake] labels={len(labels)}, sample={labels[:6]}..{labels[-3:]}")

    # -- Pack into one binary ------------------------------------------------
    # Faces are shared between pial and inflated (same topology); store once
    # per hemi. Vertex positions duplicated for the two surfaces.
    parts: list[tuple[str, np.ndarray]] = [
        # LH
        ("lh_v_infl", lh_infl_v.astype(np.float32).reshape(-1)),
        ("lh_v_pial", lh_pial_v.astype(np.float32).reshape(-1)),
        ("lh_f", lh_infl_f.astype(np.uint32).reshape(-1)),
        ("lh_sulc", lh_sulc.astype(np.float32).reshape(-1)),
        ("lh_labels", lh_labels.astype(np.uint16).reshape(-1)),
        # RH
        ("rh_v_infl", rh_infl_v.astype(np.float32).reshape(-1)),
        ("rh_v_pial", rh_pial_v.astype(np.float32).reshape(-1)),
        ("rh_f", rh_infl_f.astype(np.uint32).reshape(-1)),
        ("rh_sulc", rh_sulc.astype(np.float32).reshape(-1)),
        ("rh_labels", rh_labels.astype(np.uint16).reshape(-1)),
    ]
    offsets: dict[str, dict] = {}
    cursor = 0
    buf = bytearray()
    for name, arr in parts:
        size = arr.nbytes
        offsets[name] = {
            "offset": cursor,
            "byte_length": int(size),
            "count": int(arr.size),
            "dtype": str(arr.dtype),
        }
        buf.extend(arr.tobytes(order="C"))
        cursor += size

    OUT.mkdir(parents=True, exist_ok=True)
    bin_path = OUT / "fsaverage5.bin"
    bin_path.write_bytes(bytes(buf))

    meta = {
        "source": "nilearn.datasets.fetch_surf_fsaverage(mesh='fsaverage5') [pial + inflated]",
        "surfaces": ["pial", "inflated"],
        "hemispheres": {
            "left": {
                "vertex_count": int(len(lh_infl_v)),
                "face_count": int(len(lh_infl_f)),
            },
            "right": {
                "vertex_count": int(len(rh_infl_v)),
                "face_count": int(len(rh_infl_f)),
            },
        },
        "n_vertices_total": int(len(lh_infl_v) + len(rh_infl_v)),
        "activation_vertex_order": "lh_then_rh",
        "offsets": offsets,
        "labels": labels,
        "destrieux_note": (
            "Parcellation indices per vertex are into `labels[]`. "
            "Use the label string for tooltips and aggregation."
        ),
    }
    (OUT / "fsaverage5.meta.json").write_text(json.dumps(meta, indent=2))

    print(
        f"[bake] wrote fsaverage5.bin ({bin_path.stat().st_size / 1024 / 1024:.2f} MB) + fsaverage5.meta.json"
    )

    # Clean up old single-pial assets if they're around so we don't ship stale data.
    for stale in ("fsaverage5-pial.bin", "fsaverage5-meta.json", "fsaverage5-pial.glb"):
        p = OUT / stale
        if p.exists():
            p.unlink()
            print(f"[bake] removed stale {stale}")


if __name__ == "__main__":
    main()
