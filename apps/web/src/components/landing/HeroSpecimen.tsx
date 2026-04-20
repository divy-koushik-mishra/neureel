"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Stylized sagittal brain specimen for the landing hero.
 *
 * Custom SVG (no atlas fetch, no Three.js on first paint) designed for
 * editorial clarity. Renders a gyri-etched silhouette with an active set
 * of region spots that cycle through "firing" states. Uses the fMRI
 * signal palette defined in globals.css.
 */
export function HeroSpecimen({ className }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % REGIONS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouse({ x: nx, y: ny });
  };

  const handleLeave = () => setMouse(null);

  const px = (mouse?.x ?? 0) * 12;
  const py = (mouse?.y ?? 0) * 10;

  return (
    <div
      className={cn("relative aspect-[5/4] w-full overflow-hidden", className)}
    >
      <div className="absolute inset-0 graph-paper opacity-60" />

      {/* faint radial halo */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 50%, oklch(0.75 0.17 275 / 0.18), transparent 70%)",
        }}
      />

      <svg
        ref={svgRef}
        viewBox="0 0 520 420"
        role="img"
        aria-label="Neureel specimen — sagittal view with cortical activation"
        className="absolute inset-0 h-full w-full"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <defs>
          <radialGradient id="specimen-fill" cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="oklch(0.18 0.02 280)" />
            <stop offset="60%" stopColor="oklch(0.11 0.01 280)" />
            <stop offset="100%" stopColor="oklch(0.07 0 0)" />
          </radialGradient>
          <linearGradient id="rim-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.18 160 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.75 0.17 275 / 0.2)" />
          </linearGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hot-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          style={{
            transform: `translate(${px}px, ${py}px)`,
            transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            transformOrigin: "center",
          }}
        >
          {/* Brain silhouette — stylized sagittal, facing left.
              Frontal lobe bulges top-left, occipital curls top-right,
              cerebellum tucks under at bottom-right, brainstem descends. */}
          <path
            d="M 70 210
               C 60 170, 75 120, 120 92
               C 165 62, 235 55, 295 68
               C 355 80, 405 110, 430 155
               C 450 195, 448 232, 430 262
               C 418 284, 400 295, 380 298
               C 392 308, 402 324, 398 344
               C 394 360, 378 368, 358 364
               C 345 362, 335 354, 328 344
               C 318 352, 302 354, 288 348
               C 268 354, 238 354, 210 346
               C 180 338, 150 322, 130 296
               C 112 272, 92 248, 82 232
               C 72 222, 68 215, 70 210 Z"
            fill="url(#specimen-fill)"
            stroke="oklch(0.35 0.03 280)"
            strokeWidth="1"
          />

          {/* Cerebellum — smaller hemisphere tucked under occipital */}
          <path
            d="M 340 300
               C 340 288, 355 280, 375 282
               C 392 284, 402 296, 398 314
               C 395 328, 382 336, 365 334
               C 348 332, 340 320, 340 300 Z"
            fill="url(#specimen-fill)"
            stroke="oklch(0.38 0.04 280)"
            strokeWidth="0.75"
          />

          {/* Brainstem */}
          <path
            d="M 320 340 C 322 355, 322 372, 320 388"
            fill="none"
            stroke="oklch(0.38 0.04 280)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Central sulcus — diagonal signature line */}
          <path
            d="M 218 98 Q 232 165, 246 235 Q 254 278, 262 310"
            fill="none"
            stroke="oklch(0.48 0.05 280)"
            strokeOpacity="0.7"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />

          {/* Lateral (Sylvian) fissure — horizontal split */}
          <path
            d="M 140 240 Q 210 240, 280 258 Q 330 268, 360 270"
            fill="none"
            stroke="oklch(0.48 0.05 280)"
            strokeOpacity="0.7"
            strokeWidth="1.25"
          />

          {/* Gyri — organic fine linework */}
          <g
            fill="none"
            stroke="oklch(0.42 0.04 280)"
            strokeOpacity="0.55"
            strokeWidth="0.8"
          >
            <path d="M 105 180 Q 135 155, 175 150 Q 215 145, 250 155" />
            <path d="M 95 205 Q 130 185, 172 182 Q 218 180, 258 190" />
            <path d="M 90 225 Q 125 218, 170 220 Q 215 224, 260 232" />
            <path d="M 125 275 Q 165 268, 210 272 Q 250 278, 288 290" />
            <path d="M 290 128 Q 325 138, 358 160 Q 392 180, 418 205" />
            <path d="M 308 158 Q 340 170, 368 190 Q 398 210, 420 235" />
            <path d="M 325 200 Q 355 210, 380 230 Q 402 250, 415 270" />
          </g>

          {/* Active-region glow — moves with selection */}
          {REGIONS.map((r, i) => {
            const isActive = i === active;
            return (
              <g key={`glow-${r.id}`}>
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={isActive ? 22 : 9}
                  fill={r.color}
                  fillOpacity={isActive ? 0.35 : 0.12}
                  filter="url(#hot-glow)"
                  style={{
                    transition:
                      "r 600ms cubic-bezier(0.2, 0.8, 0.2, 1), fill-opacity 600ms",
                  }}
                />
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={isActive ? 4.5 : 2.5}
                  fill={r.color}
                  style={{
                    transition: "r 300ms ease, fill 300ms ease",
                  }}
                />
              </g>
            );
          })}

          {/* Rim highlight */}
          <path
            d="M 205 92 C 255 76, 320 76, 368 96 C 408 112, 438 148, 444 195"
            fill="none"
            stroke="url(#rim-light)"
            strokeWidth="1.5"
            filter="url(#soft-glow)"
          />
        </g>

        {/* Crosshair aligned with active region */}
        <g
          stroke="oklch(0.97 0 0 / 0.25)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        >
          <line
            x1="0"
            x2="520"
            y1={REGIONS[active]?.y ?? 0}
            y2={REGIONS[active]?.y ?? 0}
          />
          <line
            y1="0"
            y2="420"
            x1={REGIONS[active]?.x ?? 0}
            x2={REGIONS[active]?.x ?? 0}
          />
        </g>
      </svg>

      {/* Floating coordinate annotation for the active region */}
      <div
        className="pointer-events-none absolute rounded-sm border border-[color:var(--rule)] bg-background/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground backdrop-blur-sm"
        style={{
          left: `${((REGIONS[active]?.x ?? 0) / 520) * 100}%`,
          top: `${((REGIONS[active]?.y ?? 0) / 420) * 100}%`,
          transform: "translate(14px, -110%)",
          transition:
            "left 600ms cubic-bezier(0.2, 0.8, 0.2, 1), top 600ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="text-[color:var(--signal-bio)]">
          {REGIONS[active]?.code}
        </div>
        <div className="mt-0.5 text-[9px] tracking-[0.28em] text-muted-foreground">
          [{REGIONS[active]?.coord.join("  ")}]
        </div>
      </div>

      {/* Corner readouts — deliberately minimal; the InstrumentFrame
          around this component owns the top label + bottom caption. */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/70">
        <span className="h-px w-16 signal-gradient" />
        activation
      </div>
    </div>
  );
}

/**
 * Region anchors — not anatomically perfect, but carry the aesthetic.
 * Coordinates are MNI-style synthetics so the annotation feels plausible.
 */
/**
 * Brain is drawn facing left (frontal at ~x=90, occipital at ~x=420).
 * Region anchors are placed to roughly map to real sagittal anatomy.
 */
const REGIONS = [
  {
    id: "nacc",
    code: "G_nucleus_accumbens",
    x: 185,
    y: 235,
    coord: ["-12.4", "+08.1", "-06.7"] as [string, string, string],
    color: "oklch(0.72 0.22 30)",
  },
  {
    id: "amyg",
    code: "G_amygdala_L",
    x: 220,
    y: 295,
    coord: ["-22.1", "-04.3", "-18.9"] as [string, string, string],
    color: "oklch(0.72 0.22 30)",
  },
  {
    id: "v1",
    code: "G_occipital_sup",
    x: 395,
    y: 215,
    coord: ["+18.7", "-82.4", "+02.1"] as [string, string, string],
    color: "oklch(0.75 0.2 60)",
  },
  {
    id: "dlpfc",
    code: "G_front_sup",
    x: 140,
    y: 155,
    coord: ["-38.2", "+42.6", "+28.4"] as [string, string, string],
    color: "oklch(0.65 0.18 280)",
  },
  {
    id: "insula",
    code: "G_insular_short",
    x: 215,
    y: 225,
    coord: ["-36.9", "+12.7", "+04.1"] as [string, string, string],
    color: "oklch(0.7 0.2 340)",
  },
  {
    id: "brocas",
    code: "G_front_inf-Opercular",
    x: 165,
    y: 210,
    coord: ["-54.2", "+18.3", "+12.6"] as [string, string, string],
    color: "oklch(0.7 0.22 100)",
  },
];
