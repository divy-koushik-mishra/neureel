"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// -------------------------------------------------------------------------
// Binary mesh loader
// -------------------------------------------------------------------------

interface BufferDescriptor {
  offset: number;
  byte_length: number;
  count: number;
  dtype: string;
}

interface MeshMeta {
  hemispheres: {
    left: { vertex_count: number; face_count: number };
    right: { vertex_count: number; face_count: number };
  };
  n_vertices_total: number;
  activation_vertex_order: string;
  surfaces: string[];
  offsets: {
    lh_v_infl: BufferDescriptor;
    lh_v_pial: BufferDescriptor;
    lh_f: BufferDescriptor;
    lh_sulc: BufferDescriptor;
    lh_labels: BufferDescriptor;
    rh_v_infl: BufferDescriptor;
    rh_v_pial: BufferDescriptor;
    rh_f: BufferDescriptor;
    rh_sulc: BufferDescriptor;
    rh_labels: BufferDescriptor;
  };
  labels: string[];
}

interface Hemi {
  positionsInfl: Float32Array;
  positionsPial: Float32Array;
  faces: Uint32Array;
  sulc: Float32Array;
  labels: Uint16Array;
}

interface MeshBundle {
  left: Hemi;
  right: Hemi;
  meta: MeshMeta;
}

type SurfaceKind = "inflated" | "pial";

// Bump when the binary layout changes so stale browser caches don't serve
// an old meta.json alongside a fresh client bundle.
const MESH_ASSET_VERSION = "v2-pial-infl";

async function loadBundle(): Promise<MeshBundle> {
  const [metaRes, binRes] = await Promise.all([
    fetch(`/atlas/fsaverage5.meta.json?v=${MESH_ASSET_VERSION}`),
    fetch(`/atlas/fsaverage5.bin?v=${MESH_ASSET_VERSION}`),
  ]);
  if (!metaRes.ok || !binRes.ok) {
    throw new Error(
      `mesh assets missing (meta=${metaRes.status} bin=${binRes.status})`,
    );
  }
  const meta = (await metaRes.json()) as MeshMeta;
  const buf = await binRes.arrayBuffer();

  const read = (d: BufferDescriptor) =>
    buf.slice(d.offset, d.offset + d.byte_length);

  return {
    left: {
      positionsInfl: new Float32Array(read(meta.offsets.lh_v_infl)),
      positionsPial: new Float32Array(read(meta.offsets.lh_v_pial)),
      faces: new Uint32Array(read(meta.offsets.lh_f)),
      sulc: new Float32Array(read(meta.offsets.lh_sulc)),
      labels: new Uint16Array(read(meta.offsets.lh_labels)),
    },
    right: {
      positionsInfl: new Float32Array(read(meta.offsets.rh_v_infl)),
      positionsPial: new Float32Array(read(meta.offsets.rh_v_pial)),
      faces: new Uint32Array(read(meta.offsets.rh_f)),
      sulc: new Float32Array(read(meta.offsets.rh_sulc)),
      labels: new Uint16Array(read(meta.offsets.rh_labels)),
    },
    meta,
  };
}

// -------------------------------------------------------------------------
// Colormap + shading
// -------------------------------------------------------------------------

function colormap(t: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0.18, 0.35, 0.75]],
    [0.35, [0.45, 0.6, 0.9]],
    [0.55, [0.95, 0.85, 0.45]],
    [0.75, [1.0, 0.55, 0.2]],
    [1.0, [1.0, 0.2, 0.3]],
  ];
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (clamped <= b) {
      const f = (clamped - a) / (b - a || 1);
      return [
        ca[0] + (cb[0] - ca[0]) * f,
        ca[1] + (cb[1] - ca[1]) * f,
        ca[2] + (cb[2] - ca[2]) * f,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function robustRange(arr: ArrayLike<number>, length: number): [number, number] {
  if (length === 0) return [0, 1];
  const sample: number[] = new Array(length);
  for (let i = 0; i < length; i++) sample[i] = arr[i];
  sample.sort((a, b) => a - b);
  const lo = sample[Math.floor(length * 0.02)];
  const hi = sample[Math.floor(length * 0.98)];
  return [lo, hi === lo ? lo + 1e-6 : hi];
}

function norm01(v: number, lo: number, hi: number): number {
  const span = hi - lo || 1;
  return Math.max(0, Math.min(1, (v - lo) / span));
}

function buildVertexColors(
  hemi: Hemi,
  activationSlice: number[],
  threshold: number,
): Float32Array {
  const n = hemi.positionsInfl.length / 3;
  const colors = new Float32Array(n * 3);

  const [sLo, sHi] = robustRange(hemi.sulc, Math.min(hemi.sulc.length, n));
  const actLen = Math.min(activationSlice.length, n);
  const [aLo, aHi] = robustRange(activationSlice, actLen);

  // Wider gray range + gamma so the sulcal pattern reads.
  const GRAY_LO = 0.16;
  const GRAY_HI = 0.86;
  const GAMMA = 0.7;

  for (let i = 0; i < n; i++) {
    const sulc01 = norm01(hemi.sulc[i] ?? 0, sLo, sHi);
    const shade = (1 - sulc01) ** GAMMA; // gyri light, sulci dark, gamma for punch
    const gray = GRAY_LO + (GRAY_HI - GRAY_LO) * shade;

    let r = gray;
    let g = gray;
    let b = gray;

    if (i < actLen) {
      const a01 = norm01(activationSlice[i], aLo, aHi);
      if (a01 > threshold) {
        const t = (a01 - threshold) / (1 - threshold);
        const [cr, cg, cb] = colormap(t);
        const mix = 0.4 + 0.6 * t;
        r = gray * (1 - mix) + cr * mix;
        g = gray * (1 - mix) + cg * mix;
        b = gray * (1 - mix) + cb * mix;
      }
    }

    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  return colors;
}

// -------------------------------------------------------------------------
// Hemisphere mesh
// -------------------------------------------------------------------------

type Hover = {
  hemisphere: "left" | "right";
  vertexIdx: number;
  globalVertexIdx: number;
  labelIdx: number;
  labelName: string;
  activation: number;
  screen: { x: number; y: number };
};

interface HemisphereMeshProps {
  hemi: Hemi;
  labels: string[];
  side: "left" | "right";
  surface: SurfaceKind;
  globalOffset: number;
  activationSlice: number[];
  threshold: number;
  position: [number, number, number];
  rotation: [number, number, number];
  onHover: (h: Hover | null) => void;
}

function HemisphereMesh({
  hemi,
  labels,
  side,
  surface,
  globalOffset,
  activationSlice,
  threshold,
  position,
  rotation,
  onHover,
}: HemisphereMeshProps) {
  const positions =
    surface === "pial" ? hemi.positionsPial : hemi.positionsInfl;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setIndex(new THREE.BufferAttribute(hemi.faces, 1));
    const colors = buildVertexColors(hemi, activationSlice, threshold);
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
  }, [hemi, positions, activationSlice, threshold]);

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const face = e.face;
      if (!face) return;
      const posAttr = geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const local = e.object.worldToLocal(e.point.clone());
      const cands: Array<[number, THREE.Vector3]> = [
        [face.a, new THREE.Vector3().fromBufferAttribute(posAttr, face.a)],
        [face.b, new THREE.Vector3().fromBufferAttribute(posAttr, face.b)],
        [face.c, new THREE.Vector3().fromBufferAttribute(posAttr, face.c)],
      ];
      cands.sort((a, b) => a[1].distanceTo(local) - b[1].distanceTo(local));
      const [vIdx] = cands[0];
      const labelIdx = hemi.labels[vIdx] ?? 0;
      const labelName = labels[labelIdx] ?? `label_${labelIdx}`;
      const activation = activationSlice[vIdx] ?? 0;
      onHover({
        hemisphere: side,
        vertexIdx: vIdx,
        globalVertexIdx: globalOffset + vIdx,
        labelIdx,
        labelName,
        activation,
        screen: { x: e.clientX, y: e.clientY },
      });
      e.stopPropagation();
    },
    [
      geometry,
      hemi.labels,
      labels,
      activationSlice,
      side,
      globalOffset,
      onHover,
    ],
  );

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      onPointerMove={onPointerMove}
      onPointerOut={() => onHover(null)}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0.0}
        flatShading={false}
      />
    </mesh>
  );
}

// -------------------------------------------------------------------------
// View presets: rotate hemispheres, keep camera fixed
// -------------------------------------------------------------------------

type ViewPreset = "lateral" | "medial" | "dorsal";

interface HemiLayout {
  position: [number, number, number];
  rotation: [number, number, number];
}

/**
 * FreeSurfer fsaverage axes after centering:
 *   x: medial-lateral   (LH: lateral = -x, RH: lateral = +x)
 *   y: posterior-anterior (anterior = +y)
 *   z: inferior-superior  (superior = +z)
 *
 * Camera is fixed at +z looking at origin. We rotate each hemi in-place so
 * the desired face points toward +z, then offset on x to separate them.
 */
function layoutFor(view: ViewPreset): { left: HemiLayout; right: HemiLayout } {
  const sep = 58;
  const half = Math.PI / 2;
  switch (view) {
    case "lateral":
      // LH lateral (-x face) → +z via +90° rot around Y. Place LH on screen-left.
      // RH lateral (+x face) → +z via -90° rot around Y. Place RH on screen-right.
      return {
        left: { position: [-sep, 0, 0], rotation: [0, half, 0] },
        right: { position: [sep, 0, 0], rotation: [0, -half, 0] },
      };
    case "medial":
      // Mirror of lateral: LH medial (+x face) → +z via -90° rot; RH medial (-x) via +90°.
      // Swap x placement so the medial surfaces are the "outside" of the scene.
      return {
        left: { position: [-sep, 0, 0], rotation: [0, -half, 0] },
        right: { position: [sep, 0, 0], rotation: [0, half, 0] },
      };
    case "dorsal":
      // Superior face (+z) toward camera: rotate around X by -90° so +z → +z stays,
      // but anterior (+y) now points up on screen. Keep natural LR placement.
      return {
        left: { position: [-sep, 0, 0], rotation: [-half, 0, 0] },
        right: { position: [sep, 0, 0], rotation: [-half, 0, 0] },
      };
  }
}

// -------------------------------------------------------------------------
// Public component
// -------------------------------------------------------------------------

function prettyDestrieux(name: string): string {
  return name
    .replace(/^S_/, "Sulcus · ")
    .replace(/^G_/, "Gyrus · ")
    .replace(/^Pole_/, "Pole · ")
    .replace(/^Lat_/, "Lateral ")
    .replace(/_/g, " ");
}

export function BrainMesh({
  activation,
  className,
}: {
  activation: number[];
  className?: string;
}) {
  const [bundle, setBundle] = useState<MeshBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.55);
  const [view, setView] = useState<ViewPreset>("lateral");
  const [surface, setSurface] = useState<SurfaceKind>("inflated");
  const [hover, setHover] = useState<Hover | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadBundle()
      .then((b) => !cancelled && setBundle(b))
      .catch(
        (e) =>
          !cancelled && setError(e instanceof Error ? e.message : String(e)),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const layout = useMemo(() => layoutFor(view), [view]);

  const { lhAct, rhAct, topRegions } = useMemo(() => {
    if (!bundle) return { lhAct: [], rhAct: [], topRegions: [] as string[] };
    const lhN = bundle.left.positionsInfl.length / 3;
    const rhN = bundle.right.positionsInfl.length / 3;
    const lh = activation.slice(0, lhN);
    const rh = activation.slice(lhN, lhN + rhN);

    const byLabel = new Map<number, { sum: number; n: number }>();
    const push = (hemi: Hemi, slice: number[]) => {
      for (let i = 0; i < slice.length; i++) {
        const lid = hemi.labels[i] ?? 0;
        if (!lid) continue; // skip unknown / medial wall
        const cur = byLabel.get(lid) ?? { sum: 0, n: 0 };
        cur.sum += slice[i] ?? 0;
        cur.n += 1;
        byLabel.set(lid, cur);
      }
    };
    push(bundle.left, lh);
    push(bundle.right, rh);
    const top = [...byLabel.entries()]
      .map(([idx, { sum, n }]) => ({ idx, mean: sum / (n || 1) }))
      .sort((a, b) => b.mean - a.mean)
      .slice(0, 3)
      .map(({ idx }) => bundle.meta.labels[idx] ?? "");
    return { lhAct: lh, rhAct: rh, topRegions: top };
  }, [bundle, activation]);

  if (error) {
    return (
      <div
        className={`flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-border bg-card/40 text-xs text-muted-foreground ${className ?? ""}`}
      >
        mesh load failed: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-[oklch(0.07_0.02_270)] ${className ?? ""}`}
    >
      <Canvas
        camera={{ position: [0, 0, 260], fov: 32, near: 1, far: 2000 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#07070c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[120, 180, 240]} intensity={0.9} />
        <directionalLight
          position={[-180, -60, 120]}
          intensity={0.3}
          color="#8ea8ff"
        />
        {/* subtle rim light behind subjects for silhouette */}
        <directionalLight
          position={[0, 40, -220]}
          intensity={0.35}
          color="#ffb37a"
        />
        {bundle ? (
          <>
            <HemisphereMesh
              hemi={bundle.left}
              labels={bundle.meta.labels}
              side="left"
              surface={surface}
              globalOffset={0}
              activationSlice={lhAct}
              threshold={threshold}
              position={layout.left.position}
              rotation={layout.left.rotation}
              onHover={setHover}
            />
            <HemisphereMesh
              hemi={bundle.right}
              labels={bundle.meta.labels}
              side="right"
              surface={surface}
              globalOffset={bundle.left.positionsInfl.length / 3}
              activationSlice={rhAct}
              threshold={threshold}
              position={layout.right.position}
              rotation={layout.right.rotation}
              onHover={setHover}
            />
          </>
        ) : null}
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={160}
          maxDistance={420}
          makeDefault
        />
      </Canvas>

      {/* Top-left: view + surface toggles */}
      <div className="absolute left-3 top-3 flex items-center gap-2 text-[11px] uppercase tracking-wider">
        <div className="flex gap-1 rounded-md border border-border/60 bg-card/70 p-1 backdrop-blur">
          {(["lateral", "medial", "dorsal"] as ViewPreset[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-2 py-1 transition-colors ${
                view === v
                  ? "bg-brand/20 text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-md border border-border/60 bg-card/70 p-1 backdrop-blur">
          {(["inflated", "pial"] as SurfaceKind[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSurface(s)}
              className={`rounded px-2 py-1 transition-colors ${
                surface === s
                  ? "bg-brand/20 text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Top-right: threshold */}
      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-md border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <span>threshold</span>
        <input
          type="range"
          min={0}
          max={0.95}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="h-1 w-28 accent-brand"
        />
        <span className="tabular-nums text-foreground/80">
          {threshold.toFixed(2)}
        </span>
      </div>

      {/* Bottom-left: source + top regions */}
      <div className="pointer-events-none absolute bottom-2 left-3 max-w-[60%] text-[10px] uppercase tracking-widest text-muted-foreground">
        <div>fsaverage5 · {surface}</div>
        {topRegions.length ? (
          <div className="mt-0.5 truncate opacity-70">
            top: {topRegions.map(prettyDestrieux).join(" · ")}
          </div>
        ) : null}
      </div>

      {/* Bottom-right: color scale */}
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>low</span>
        <span
          className="inline-block h-2 w-24 rounded-full"
          style={colorBarStyle()}
        />
        <span>high</span>
      </div>

      {hover && containerRef.current ? (
        <HoverCard hover={hover} containerRef={containerRef} />
      ) : null}
    </div>
  );
}

function HoverCard({
  hover,
  containerRef,
}: {
  hover: Hover;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const el = containerRef.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const x = hover.screen.x - rect.left;
  const y = hover.screen.y - rect.top;
  const left = Math.max(8, Math.min(rect.width - 220, x + 12));
  const top = Math.max(8, Math.min(rect.height - 70, y + 12));
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[200px] rounded-md border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={{ left, top }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{prettyDestrieux(hover.labelName)}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {hover.hemisphere}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-muted-foreground">
        <span>activation</span>
        <span className="tabular-nums text-foreground">
          {hover.activation.toFixed(4)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>vertex</span>
        <span className="tabular-nums">#{hover.globalVertexIdx}</span>
      </div>
    </div>
  );
}

function colorBarStyle(): React.CSSProperties {
  const stops: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const [r, g, b] = colormap(i / 10);
    stops.push(
      `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}) ${i * 10}%`,
    );
  }
  return { background: `linear-gradient(90deg, ${stops.join(", ")})` };
}
