# Brain atlas

How Neureel turns TRIBE v2's per-vertex cortical activation vector into
something a brand manager can look at and a product surface can drill into.

## What TRIBE v2 emits

`model.predict()` returns `preds: np.ndarray` of shape `(n_timesteps, n_vertices)`
where `n_vertices == 20484` — the fsaverage5 cortical surface (10,242 per
hemisphere, left then right).

That vertex ordering is preserved end-to-end: `activation_map[i]` in the
webhook payload, `rawOutput.timeseries.*` in Postgres, and vertex `i` in the
web viewer's binary mesh all point at the same cortical coordinate.

## The baked mesh ([`apps/web/public/atlas/`](../apps/web/public/atlas/))

A single compact binary + JSON metadata pair, produced by
[`ml/scripts/bake_mesh.py`](../ml/scripts/bake_mesh.py):

```
apps/web/public/atlas/
├── fsaverage5.bin        ~1 MB  packed geometry + per-vertex attributes
└── fsaverage5.meta.json          offsets into the binary + Destrieux label names
```

### Binary layout

All arrays are little-endian, concatenated in this order per hemisphere:

| Key | dtype | shape | bytes | Meaning |
|---|---|---|---|---|
| `lh_v_infl` | float32 | (10242, 3) | 122 KB | LH inflated vertex positions (centered at origin) |
| `lh_v_pial` | float32 | (10242, 3) | 122 KB | LH pial (anatomical) vertex positions |
| `lh_f`      | uint32  | (20480, 3) | 246 KB | LH face indices (shared between pial + inflated) |
| `lh_sulc`   | float32 | (10242,)   | 41 KB  | LH per-vertex sulcal depth (signed; positive = sulci) |
| `lh_labels` | uint16  | (10242,)   | 20 KB  | LH Destrieux label index (into `meta.labels[]`) |
| `rh_*`      | same shapes | | | right hemisphere, same layout |

Offsets and counts live in `fsaverage5.meta.json.offsets` so the web loader
can slice directly without parsing.

### Source

- Surfaces + sulc: [`nilearn.datasets.fetch_surf_fsaverage(mesh='fsaverage5')`](https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_surf_fsaverage.html)
- Parcellation: [`nilearn.datasets.fetch_atlas_surf_destrieux()`](https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_atlas_surf_destrieux.html)
- Pial and inflated share vertex IDs + face topology, so toggling surfaces
  in the viewer doesn't invalidate anything. Inflated coordinates are scaled
  to roughly match pial radius so users don't see a size jump when toggling.

## Tracked regions and the cortical proxy

TRIBE v2's output is **cortical-only**. The spec's virality weights reference
subcortical regions (amygdala, nucleus accumbens) the model literally can't
see. Rather than drop those regions and rewrite the landing-page copy, we map
each tracked region to its closest cortical neighbor via
[`ml/inference/regions.py`](../ml/inference/regions.py) → `CORTICAL_PROXY`:

| Tracked region | Function | Proxied from Destrieux labels |
|---|---|---|
| `v1`                 | Visual attention              | `S_calcarine`, `G_oc-temp_med-Lingual` |
| `dlpfc`              | Decision making               | `G_front_sup`, `G_front_middle` |
| `brocas_area`        | Language / narrative          | `G_front_inf-Triangul`, `G_front_inf-Opercular` |
| `insula`             | Social emotion / empathy      | `G_insular_short`, `G_Ins_lg_and_S_cent_ins` |
| `amygdala` ⚠         | Emotional arousal (subcortical) | `Pole_temporal`, `G_temporal_inf` (temporal pole proxy) |
| `nucleus_accumbens` ⚠| Reward / dopamine (subcortical) | `G_and_S_cingul-Ant`, `G_front_middle` (mPFC proxy) |

The `⚠` proxies are not anatomically equivalent — they're reasonably
correlated cortical neighbors. Virality weights are still module-level
constants (`VIRALITY_WEIGHTS` in `regions.py` and `scoring.ts`), trivially
retuneable when real engagement data shows up. When the time comes to move
to a TRIBE variant that covers subcortical structures, only the `CORTICAL_PROXY`
table needs to change.

Matching uses substring `in` — not strict equality — because Destrieux
sometimes suffixes labels. An `[atlas] tracked vertex counts: {...}` line
is printed during `@modal.enter` so a broken proxy shows up in logs
immediately (look for any tracked region with `0` vertices).

## How the viewer consumes the mesh

[`apps/web/src/components/BrainMesh.tsx`](../apps/web/src/components/BrainMesh.tsx):

1. Fetches `fsaverage5.bin` + `fsaverage5.meta.json` (versioned URL query
   defeats stale caches after a layout change).
2. Slices out LH/RH position + face + sulc + label arrays by offset.
3. Builds a `THREE.BufferGeometry` per hemisphere. Picks positions based on
   the active surface toggle (pial vs inflated) without rebuilding indices.
4. **Per-vertex color** = sulc-shaded gray base blended with the TRIBE
   activation colormap above a user-controlled threshold. Sulc uses robust
   (P2–P98) range + gamma so gyri/sulci contrast pops even in low-activation
   areas. Activation uses the same robust range per inference.
5. **Hemisphere rotation**, not camera movement, drives view presets. For
   "lateral", each hemi rotates around Y so its outer surface faces the fixed
   camera; "medial" swaps the rotation; "dorsal" tilts around X. Keeps the
   camera rig trivial.
6. **Hover**: raycast via `onPointerMove`, pick the nearest of the three hit
   triangle vertices, look up `labels[labelIdx]` → region name, show a
   tooltip with activation value + hemisphere + vertex index.

## Re-baking

When you need fresh mesh assets (e.g. after updating `CORTICAL_PROXY` to
include more Destrieux labels, or swapping to a different parcellation):

```bash
# One-time local setup
pip install nibabel nilearn numpy

# Run from repo root
python ml/scripts/bake_mesh.py
```

Outputs over-write `apps/web/public/atlas/fsaverage5.bin` +
`fsaverage5.meta.json`. Bump `MESH_ASSET_VERSION` in
[`BrainMesh.tsx`](../apps/web/src/components/BrainMesh.tsx) if the binary
layout changed — the versioned URL param forces cache busting in browsers.

## Why fsaverage5 specifically

- TRIBE v2's output space. Non-negotiable — resampling would throw away
  vertex-level precision.
- fsaverage5 is the low-poly tier (20k vertices total, vs fsaverage's 300k)
  — small enough to ship as an uncompressed asset, big enough to look like
  a brain once sulc shading is applied.
- Widely used in neuroscience viz, so downstream integrations (PySurfer,
  connectome-workbench, Freeview) see the same coordinates we do.
