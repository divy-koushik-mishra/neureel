"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// --- mesh binary format ------------------------------------------------

interface MeshMeta {
  layout: {
    vertices: {
      offset: number;
      count: number;
      components: 3;
      dtype: "float32";
    };
    faces: { offset: number; count: number; components: 3; dtype: "uint32" };
  };
  hemispheres: {
    left: { vertex_start: number; vertex_count: number };
    right: { vertex_start: number; vertex_count: number };
  };
  n_vertices: number;
  n_faces: number;
  hemisphere_offset_x: number;
}

interface MeshData {
  positions: Float32Array; // flat (n_vertices * 3)
  indices: Uint32Array; // flat (n_faces * 3)
  meta: MeshMeta;
}

async function loadMesh(): Promise<MeshData> {
  const [metaRes, binRes] = await Promise.all([
    fetch("/atlas/fsaverage5-meta.json", { cache: "force-cache" }),
    fetch("/atlas/fsaverage5-pial.bin", { cache: "force-cache" }),
  ]);
  if (!metaRes.ok || !binRes.ok) {
    throw new Error(`mesh assets missing (${metaRes.status}/${binRes.status})`);
  }
  const meta = (await metaRes.json()) as MeshMeta;
  const buf = await binRes.arrayBuffer();
  const { vertices, faces } = meta.layout;
  const positions = new Float32Array(
    buf,
    vertices.offset,
    vertices.count * vertices.components,
  );
  const indices = new Uint32Array(
    buf,
    faces.offset,
    faces.count * faces.components,
  );
  return { positions, indices, meta };
}

// --- colormap ----------------------------------------------------------

// Five-stop perceptual ramp (viridis-ish, tuned to the app's brand).
// Values in [0, 1]; returns [r, g, b] each in [0, 1].
function ramp(t: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0.12, 0.12, 0.16]], // near-background (unlit)
    [0.2, [0.18, 0.25, 0.5]], // deep blue
    [0.45, [0.35, 0.5, 0.85]], // sky blue
    [0.7, [0.8, 0.55, 0.3]], // warm amber
    [1.0, [1.0, 0.3, 0.35]], // hot pink/red
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

// --- mesh component ----------------------------------------------------

function BrainSurface({
  mesh,
  activation,
}: {
  mesh: MeshData;
  activation: number[];
}) {
  const ref = useRef<THREE.Mesh>(null);

  // Build BufferGeometry with per-vertex colors.
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geom.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

    const n = mesh.positions.length / 3;
    const colors = new Float32Array(n * 3);
    const getActivation = (i: number): number => {
      // If the activation array is shorter than the mesh (e.g., different
      // fsaverage5 ordering), clamp; if longer, only take the first n.
      if (i < activation.length) return activation[i];
      return 0;
    };

    // Min/max for dynamic range; guard against flat arrays.
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < Math.min(n, activation.length); i++) {
      const v = activation[i];
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (!Number.isFinite(lo) || lo === hi) {
      lo = 0;
      hi = 1;
    }
    const span = hi - lo || 1;

    for (let i = 0; i < n; i++) {
      const a = Number.isFinite(getActivation(i)) ? getActivation(i) : 0;
      const t = (a - lo) / span;
      const [r, g, b] = ramp(t);
      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
  }, [mesh, activation]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        roughness={0.6}
        metalness={0.05}
        flatShading={false}
      />
    </mesh>
  );
}

// --- entry -------------------------------------------------------------

export interface BrainMeshProps {
  /** Per-vertex activation, length should match fsaverage5 vertices (20484). */
  activation: number[];
  className?: string;
}

export function BrainMesh({ activation, className }: BrainMeshProps) {
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMesh()
      .then((m) => {
        if (!cancelled) setMesh(m);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-b from-black to-[oklch(0.08_0.02_275)] ${className ?? ""}`}
    >
      <Canvas
        camera={{ position: [0, 20, 180], fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[80, 100, 120]} intensity={0.7} />
        <directionalLight
          position={[-80, -60, -100]}
          intensity={0.35}
          color="#7aa2ff"
        />
        <Suspense fallback={null}>
          {mesh ? <BrainSurface mesh={mesh} activation={activation} /> : null}
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={80}
          maxDistance={320}
          makeDefault
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>fsaverage5 · pial</span>
        <span className="opacity-50">drag to rotate · scroll to zoom</span>
      </div>
      <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>activation</span>
        <span
          className="inline-block h-2 w-24 rounded-full"
          style={colorBarStyle()}
        />
        <span>high</span>
      </div>
    </div>
  );
}

function colorBarStyle(): React.CSSProperties {
  const stops: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const [r, g, b] = ramp(i / 10);
    stops.push(
      `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}) ${i * 10}%`,
    );
  }
  return { background: `linear-gradient(90deg, ${stops.join(", ")})` };
}
