"use client";

import {
  Download,
  FlaskConical,
  Pause,
  Play,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrainMesh } from "@/components/BrainMesh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseNpyFloat32 } from "@/lib/npy";
import { cn } from "@/lib/utils";
import type { RawOutput } from "./Playground";

// -------------------------------------------------------------------------
// Types + constants
// -------------------------------------------------------------------------

interface Props {
  fileUrl: string | null;
  fileName: string;
  inputType: string;
  /** Mean-over-time 20k-vertex vector — used until the per-timestep tensor
   *  is fetched (or forever if the fetch fails). */
  fallbackActivation: number[] | null;
  /** Playground's normalized rawOutput. We lean on timeseries + metadata +
   *  raw_npy_url + peak_moments here. */
  rawOutput: RawOutput;
}

type NpyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; T: number; V: number; data: Float32Array }
  | { status: "error"; message: string };

const TRACKED_COLORS: Record<string, string> = {
  v1: "oklch(0.72 0.18 230)",
  dlpfc: "oklch(0.75 0.15 280)",
  brocas_area: "oklch(0.73 0.17 150)",
  insula: "oklch(0.75 0.16 60)",
  amygdala: "oklch(0.68 0.22 20)",
  nucleus_accumbens: "oklch(0.72 0.2 330)",
};

function prettyRegion(name: string): string {
  return name
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function fmtSeconds(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const total = Math.max(0, Math.round(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// -------------------------------------------------------------------------
// Public component
// -------------------------------------------------------------------------

export function Replay({
  fileUrl,
  fileName,
  inputType,
  fallbackActivation,
  rawOutput,
}: Props) {
  const isVideo = inputType === "video";
  const timestepSec = rawOutput.metadata?.timestep_seconds ?? 1;
  const wholeBrain = rawOutput.timeseries?.whole_brain_mean ?? [];
  const peakMoments = rawOutput.peak_moments ?? [];
  const trackedSeries = rawOutput.timeseries?.tracked_region_series ?? {};
  const T =
    rawOutput.metadata?.n_timesteps ??
    wholeBrain.length ??
    Object.values(trackedSeries)[0]?.length ??
    0;
  const npyUrl = rawOutput.raw_npy_url ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentT, setCurrentT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [npy, setNpy] = useState<NpyState>({ status: "idle" });
  const npyLoadStarted = useRef(false);

  // --- NPY lazy load ----------------------------------------------------

  const loadNpyOnce = useCallback(async () => {
    if (!npyUrl || npyLoadStarted.current) return;
    npyLoadStarted.current = true;
    setNpy({ status: "loading" });
    try {
      const res = await fetch(npyUrl);
      if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      const { shape, data } = parseNpyFloat32(buf);
      if (shape.length !== 2) {
        throw new Error(`Expected 2D (T, V), got shape ${shape.join("x")}`);
      }
      const [tensorT, V] = shape;
      setNpy({ status: "ready", T: tensorT, V, data });
    } catch (err) {
      npyLoadStarted.current = false; // allow retry on next interaction
      setNpy({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [npyUrl]);

  // --- Video ↔ timestep sync -------------------------------------------

  const seekToTimestep = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(T - 1, Math.round(t)));
      setCurrentT(clamped);
      const v = videoRef.current;
      if (v) {
        const target = clamped * timestepSec + timestepSec / 2;
        if (Number.isFinite(v.duration)) {
          v.currentTime = Math.min(
            Math.max(v.duration - 0.01, 0),
            Math.max(0, target),
          );
        } else {
          v.currentTime = target;
        }
      }
    },
    [T, timestepSec],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const next = Math.min(T - 1, Math.floor(v.currentTime / timestepSec));
      setCurrentT((prev) => (prev === next ? prev : Math.max(0, next)));
    };
    const onPlayEvt = () => {
      setIsPlaying(true);
      void loadNpyOnce();
    };
    const onPauseEvt = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlayEvt);
    v.addEventListener("pause", onPauseEvt);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlayEvt);
      v.removeEventListener("pause", onPauseEvt);
      v.removeEventListener("ended", onEnded);
    };
  }, [T, timestepSec, loadNpyOnce]);

  // --- Current-frame activation view -----------------------------------

  const currentActivation = useMemo<number[] | Float32Array | null>(() => {
    if (npy.status === "ready" && npy.T > currentT) {
      // Zero-copy typed-array view into the big (T, V) tensor.
      return npy.data.subarray(currentT * npy.V, (currentT + 1) * npy.V);
    }
    return fallbackActivation;
  }, [npy, currentT, fallbackActivation]);

  // --- Keyboard shortcuts ----------------------------------------------

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekToTimestep(currentT + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekToTimestep(currentT - 1);
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    },
    [currentT, seekToTimestep, togglePlay],
  );

  // --- Derived per-frame stats -----------------------------------------

  const wholeBrainAtT = wholeBrain[currentT] ?? 0;
  const perRegion = Object.entries(trackedSeries).map(([name, series]) => ({
    name,
    value: series[currentT] ?? 0,
  }));
  const topRegion =
    perRegion.slice().sort((a, b) => b.value - a.value)[0] ?? null;

  // ---------------------------------------------------------------------
  return (
    <Card className="p-0" tabIndex={0} onKeyDown={onKeyDown}>
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-brand" />
          <CardTitle>Replay</CardTitle>
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            frame-by-frame
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <span>
            {fmtSeconds(currentT * timestepSec)} / {fmtSeconds(T * timestepSec)}
          </span>
          <span className="text-border">·</span>
          <span>
            timestep {Math.min(T, currentT + 1)} / {T || "–"}
          </span>
          {npy.status === "loading" ? (
            <span className="text-amber-300">loading frame data…</span>
          ) : null}
          {npy.status === "error" ? (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <TriangleAlert className="size-3" />
              using mean activation (npy unavailable)
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-5">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Media pane */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
              {fileUrl ? (
                isVideo ? (
                  // biome-ignore lint/a11y/useMediaCaption: user-uploaded video, no caption track available
                  <video
                    ref={videoRef}
                    src={fileUrl}
                    preload="metadata"
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  // biome-ignore lint/performance/noImgElement: signed R2 URL, next/image adds no value
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="h-full w-full object-contain"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Media unavailable
                </div>
              )}
            </div>
            {isVideo ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:bg-card"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </button>
                <p className="truncate text-xs text-muted-foreground">
                  {fileName}
                </p>
                {fileUrl ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/50 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                    aria-label="Open original in a new tab"
                  >
                    <Download className="size-3.5" />
                    Original
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <StatsPanel
            T={T}
            currentT={currentT}
            timestepSec={timestepSec}
            wholeBrainAtT={wholeBrainAtT}
            topRegion={topRegion}
            perRegion={perRegion}
          />
        </div>

        <Scrubber
          T={T}
          currentT={currentT}
          timestepSec={timestepSec}
          wholeBrain={wholeBrain}
          peakTimesteps={peakMoments.map((p) => p.timestep)}
          loadingNpy={npy.status === "loading"}
          onSeek={(t) => {
            seekToTimestep(t);
            void loadNpyOnce();
          }}
        />

        <section className="flex flex-col gap-2">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand/80">
            Live brain
          </div>
          <BrainMesh activation={currentActivation ?? []} />
        </section>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Scrubber (SVG) — envelope + peak markers + draggable playhead
// -------------------------------------------------------------------------

interface ScrubberProps {
  T: number;
  currentT: number;
  timestepSec: number;
  wholeBrain: number[];
  peakTimesteps: number[];
  loadingNpy: boolean;
  onSeek: (t: number) => void;
}

function Scrubber({
  T,
  currentT,
  timestepSec,
  wholeBrain,
  peakTimesteps,
  loadingNpy,
  onSeek,
}: ScrubberProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const envelopePath = useMemo(() => {
    if (wholeBrain.length < 2) return "";
    const W = 1000;
    const H = 48;
    const pad = 6;
    const lo = Math.min(...wholeBrain);
    const hi = Math.max(...wholeBrain);
    const span = hi - lo || 1;
    const step = (W - pad * 2) / (wholeBrain.length - 1);
    const points = wholeBrain.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (H - pad * 2) * (1 - (v - lo) / span);
      return [x, y] as const;
    });
    const top = points.map(([x, y]) => `${x},${y}`).join(" L ");
    return `M ${top} L ${W - pad},${H - pad} L ${pad},${H - pad} Z`;
  }, [wholeBrain]);

  const handlePointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || T <= 0) return;
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const frac = x / rect.width;
      const t = Math.round(frac * (T - 1));
      onSeek(t);
    },
    [T, onSeek],
  );

  if (T <= 1) {
    return (
      <div className="text-[11px] text-muted-foreground">
        Single-timestep inference — no scrub range.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={T - 1}
        aria-valuenow={currentT}
        aria-label="Timestep scrubber"
        tabIndex={0}
        className={cn(
          "relative block h-12 w-full cursor-pointer touch-none select-none rounded-md border border-border/60 bg-card/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          loadingNpy && "animate-pulse",
        )}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          draggingRef.current = true;
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          handlePointer(e);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          (e.target as Element).releasePointerCapture?.(e.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 48"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="wbfill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.75 0.17 275)"
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.75 0.17 275)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {envelopePath ? (
            <path d={envelopePath} fill="url(#wbfill)" stroke="none" />
          ) : null}
          {peakTimesteps.map((p) => (
            <line
              key={p}
              x1={(p / Math.max(1, T - 1)) * 1000}
              x2={(p / Math.max(1, T - 1)) * 1000}
              y1={2}
              y2={46}
              stroke="oklch(0.8 0.18 50)"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
          ))}
          <line
            x1={(currentT / Math.max(1, T - 1)) * 1000}
            x2={(currentT / Math.max(1, T - 1)) * 1000}
            y1={0}
            y2={48}
            stroke="oklch(0.95 0 0)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>0:00</span>
        <span>{fmtSeconds(T * timestepSec)}</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Stats panel
// -------------------------------------------------------------------------

interface StatsPanelProps {
  T: number;
  currentT: number;
  timestepSec: number;
  wholeBrainAtT: number;
  topRegion: { name: string; value: number } | null;
  perRegion: Array<{ name: string; value: number }>;
}

function StatsPanel({
  T,
  currentT,
  timestepSec,
  wholeBrainAtT,
  topRegion,
  perRegion,
}: StatsPanelProps) {
  const max = Math.max(0.001, ...perRegion.map((r) => r.value));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          At {fmtSeconds(currentT * timestepSec)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {T > 0 ? `${Math.min(T, currentT + 1)}/${T}` : "–"}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Whole-brain mean
        </p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">
          {wholeBrainAtT.toFixed(4)}
        </p>
      </div>
      {topRegion ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Top region
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-sm">
            <span
              className="size-2 rounded-full"
              style={{ background: TRACKED_COLORS[topRegion.name] ?? "#888" }}
            />
            <span className="font-medium">{prettyRegion(topRegion.name)}</span>
            <span className="tabular-nums text-muted-foreground">
              {topRegion.value.toFixed(3)}
            </span>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5 border-t border-border/50 pt-3">
        {perRegion.map((r) => {
          const w = Math.max(2, (r.value / max) * 100);
          return (
            <div
              key={r.name}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: TRACKED_COLORS[r.name] ?? "#888" }}
              />
              <span className="w-28 shrink-0 truncate">
                {prettyRegion(r.name)}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${w}%`,
                    background: TRACKED_COLORS[r.name] ?? "#888",
                    opacity: 0.35 + (r.value / max) * 0.6,
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums">
                {r.value.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
