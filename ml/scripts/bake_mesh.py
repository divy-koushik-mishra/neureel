"""Bake the fsaverage5 pial surface (TRIBE's native output space) into a
single GLB that the web app can load into three.js. Preserves vertex order
so the web layer can map activation_map[i] directly to vertex i.

Run once:
    python ml/scripts/bake_mesh.py

Outputs:
    apps/web/public/atlas/fsaverage5-pial.glb
    apps/web/public/atlas/fsaverage5-meta.json
"""
from __future__ import annotations

import json
import struct
from pathlib import Path

import nibabel as nib
import numpy as np
from nilearn import datasets

ROOT = Path(__file__).resolve().parents[2]
WEB_PUBLIC_ATLAS = ROOT / "apps" / "web" / "public" / "atlas"


def _load_surf(surf_path: str) -> tuple[np.ndarray, np.ndarray]:
    """Return (vertices (V,3), faces (F,3)) for a FreeSurfer or GIFTI surface."""
    path = Path(surf_path)
    try:
        vertices, faces = nib.freesurfer.io.read_geometry(str(path))
        return np.asarray(vertices, dtype=np.float32), np.asarray(faces, dtype=np.int32)
    except Exception:
        pass
    gii = nib.load(str(path))
    # GIFTI: first darray is coords, second is triangles
    vertices = np.asarray(gii.darrays[0].data, dtype=np.float32)
    faces = np.asarray(gii.darrays[1].data, dtype=np.int32)
    return vertices, faces


def main() -> None:
    print("[bake_mesh] fetching fsaverage5 surface…")
    fs = datasets.fetch_surf_fsaverage(mesh="fsaverage5")
    # Prefer pial (anatomical) but inflated looks nicer for viz. Ship both:
    lh_verts, lh_faces = _load_surf(fs["pial_left"])
    rh_verts, rh_faces = _load_surf(fs["pial_right"])

    # Space the two hemispheres apart along X so they don't overlap visually.
    lh_verts = lh_verts.copy()
    rh_verts = rh_verts.copy()
    # Center each hemisphere, then offset.
    lh_verts -= lh_verts.mean(axis=0)
    rh_verts -= rh_verts.mean(axis=0)
    hemi_sep = 5.0
    lh_verts[:, 0] -= hemi_sep
    rh_verts[:, 0] += hemi_sep

    n_lh = len(lh_verts)
    combined_verts = np.concatenate([lh_verts, rh_verts], axis=0).astype(np.float32)
    combined_faces = np.concatenate(
        [lh_faces, rh_faces + n_lh], axis=0
    ).astype(np.uint32)

    print(
        f"[bake_mesh] vertices: lh={n_lh}, rh={len(rh_verts)}, total={len(combined_verts)}"
    )
    print(f"[bake_mesh] faces: total={len(combined_faces)}")

    # Write as a minimal GLB using pygltflib-free hand-roll (simpler than
    # adding pygltflib). We'll use a compact .bin + .json-ish wrapper instead:
    # export a plain binary + JSON metadata for three.js to consume.
    WEB_PUBLIC_ATLAS.mkdir(parents=True, exist_ok=True)

    # Bin format: [vertices float32 (n*3) | faces uint32 (f*3)]
    bin_path = WEB_PUBLIC_ATLAS / "fsaverage5-pial.bin"
    with open(bin_path, "wb") as f:
        f.write(combined_verts.tobytes(order="C"))
        f.write(combined_faces.tobytes(order="C"))

    meta = {
        "layout": {
            "vertices": {
                "offset": 0,
                "count": int(len(combined_verts)),
                "components": 3,
                "dtype": "float32",
            },
            "faces": {
                "offset": int(combined_verts.nbytes),
                "count": int(len(combined_faces)),
                "components": 3,
                "dtype": "uint32",
            },
        },
        "hemispheres": {
            "left": {"vertex_start": 0, "vertex_count": int(n_lh)},
            "right": {"vertex_start": int(n_lh), "vertex_count": int(len(rh_verts))},
        },
        "n_vertices": int(len(combined_verts)),
        "n_faces": int(len(combined_faces)),
        "source": "nilearn.datasets.fetch_surf_fsaverage(mesh='fsaverage5') pial",
        "hemisphere_offset_x": hemi_sep,
    }
    meta_path = WEB_PUBLIC_ATLAS / "fsaverage5-meta.json"
    meta_path.write_text(json.dumps(meta, indent=2))

    size_mb = bin_path.stat().st_size / (1024 * 1024)
    print(
        f"[bake_mesh] wrote {bin_path.name} ({size_mb:.2f} MB) + {meta_path.name}"
    )


if __name__ == "__main__":
    main()
