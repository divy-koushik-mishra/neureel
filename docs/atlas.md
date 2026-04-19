# Brain atlas

Neureel's results page uses an MNI152 volume as the anatomical base layer in
the 3D Niivue viewer. The viewer falls back to a 2D SVG schematic when WebGL
is unavailable or the volume fails to load.

## Asset location

`apps/web/public/atlas/mni152.nii.gz` — served statically at
`/atlas/mni152.nii.gz`.

**Not yet shipped.** The MNI152 NIfTI must be dropped into that path before
the Niivue branch can render. Until it is, the BrainViewer will always hit
its SVG fallback (which is fine; the data table and recommendations still
render).

## Recommended source

MNI152 2009c nonlinear symmetric, T1-weighted:

- Download: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/
- License: Free for research and commercial use (MNI ICBM 152 terms).

Pick the 1 mm T1 volume, gzip to `.nii.gz`, keep under ~6 MB.

## Follow-up: voxel cross-walk

TRIBE v2 emits a 1-D activation vector (~70k voxels). The mapping from voxel
index → named region currently lives in `ml/utils/atlas.py` as an evenly
striped placeholder over the tracked region set. Before the output is
scientifically meaningful, we need:

1. The voxel ordering used by TRIBE v2 (confirm from `demo_utils.py` in
   `facebook/tribev2`).
2. A standard atlas mapped into that same space (Harvard-Oxford, AAL, or
   the Destrieux parcellation via `nilearn.datasets`).
3. A precomputed `{voxel_idx: region_name}` dict cached in the Modal Volume
   so we don't pay the crosswalk on every inference.

Until that lands, `virality_score` and the region bars are computed from the
placeholder mapping, so they should not be presented as ground truth.
