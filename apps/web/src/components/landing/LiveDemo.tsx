"use client";

import { useEffect, useRef, useState } from "react";
import { ChromaticRule } from "./ChromaticRule";
import { InstrumentFrame } from "./InstrumentFrame";

/**
 * Interactive "specimen under observation" section. A synthetic timeline
 * drives an activation state that both a schematic brain and a frame
 * thumbnail respond to. Meant to feel like a scrubber on a scientific
 * replay — not a real player.
 */

const FRAMES = [
  {
    t: 0.08,
    caption: "wide shot · establishing",
    region: "G_oc-temp_lat",
    activation: 0.42,
    dominant: "V1",
    sigma: "+0.31 σ",
  },
  {
    t: 0.26,
    caption: "face close-up · smile",
    region: "G_amygdala_L",
    activation: 0.74,
    dominant: "Amygdala",
    sigma: "+0.91 σ",
  },
  {
    t: 0.48,
    caption: "reveal · product drop",
    region: "G_nucleus_accumbens",
    activation: 0.91,
    dominant: "N. Accumbens",
    sigma: "+1.24 σ",
  },
  {
    t: 0.7,
    caption: "voiceover · punchline",
    region: "G_front_inf-Opercular",
    activation: 0.58,
    dominant: "Broca's",
    sigma: "+0.62 σ",
  },
  {
    t: 0.88,
    caption: "CTA · overlay",
    region: "G_front_sup",
    activation: 0.63,
    dominant: "dlPFC",
    sigma: "+0.71 σ",
  },
];

export function LiveDemo() {
  const [progress, setProgress] = useState(0);
  const [hovering, setHovering] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  // Auto-advance the scrubber when not being hovered.
  useEffect(() => {
    if (hovering) return;
    const id = setInterval(() => {
      setProgress((p) => (p + 0.004) % 1);
    }, 40);
    return () => clearInterval(id);
  }, [hovering]);

  const current =
    FRAMES.find((f, i) => {
      const next = FRAMES[i + 1];
      return progress >= f.t && (!next || progress < next.t);
    }) ?? FRAMES[0];

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    setProgress(Math.max(0, Math.min(1, x)));
  };

  return (
    <section
      id="cases"
      className="relative border-b border-[color:var(--rule)] bg-gradient-to-b from-background via-[color:var(--paper)]/40 to-background"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 02 / observation
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              A specimen
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                {" "}
                under observation.
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-muted-foreground sm:mt-5 sm:text-[16px]">
              Scrub the rail. Every frame re-colors the cortex, every peak cites
              a region. This is what Neureel shows you for your own uploads.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* Frame preview */}
          <InstrumentFrame
            label="frame · thumbnail"
            readout={<span>{(progress * 100).toFixed(1)}%</span>}
            caption={
              <>
                <span>{current.caption}</span>
                <span className="opacity-70">t · {progress.toFixed(2)}</span>
              </>
            }
          >
            <div className="relative aspect-video overflow-hidden bg-black">
              <FrameMock progress={progress} />
            </div>
          </InstrumentFrame>

          {/* Schematic brain */}
          <InstrumentFrame
            label="cortex · sagittal"
            readout={
              <span className="text-[color:var(--signal-hot)]">
                peak · {current.dominant}
              </span>
            }
            caption={
              <>
                <span>{current.region}</span>
                <span className="text-[color:var(--signal-hot)]">
                  {current.sigma}
                </span>
              </>
            }
          >
            <div className="relative aspect-video overflow-hidden bg-[color:var(--paper)]">
              <SchematicCortex frame={current} progress={progress} />
            </div>
          </InstrumentFrame>
        </div>

        {/* Scrubber rail */}
        <div className="mt-10">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            <span>timeline · activation (σ)</span>
            <span className="flex items-center gap-2">
              <span
                className={`size-1 rounded-full ${
                  hovering
                    ? "bg-[color:var(--signal-hot)]"
                    : "bg-[color:var(--signal-bio)] animate-specimen-pulse"
                }`}
              />
              {hovering ? "manual" : "auto"}
            </span>
          </div>
          <div
            ref={railRef}
            role="slider"
            aria-label="Timeline scrubber"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onMouseMove={handleMove}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft")
                setProgress((p) => Math.max(0, p - 0.02));
              if (e.key === "ArrowRight")
                setProgress((p) => Math.min(1, p + 0.02));
            }}
            className="relative h-16 cursor-crosshair select-none border border-[color:var(--rule)] bg-[color:var(--paper)] sm:h-20"
          >
            <TimelineSparkline progress={progress} />
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-[color:var(--signal-hot)]"
              style={{
                left: `${progress * 100}%`,
                boxShadow: "0 0 8px oklch(0.72 0.22 30)",
              }}
            />
            {FRAMES.map((f) => (
              <div
                key={f.t}
                className="pointer-events-none absolute top-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70"
                style={{ left: `calc(${f.t * 100}% + 4px)` }}
              >
                {Math.round(f.t * 100)}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
            <span>0.00</span>
            <span>scrub to inspect</span>
            <span>1.00</span>
          </div>
        </div>
      </div>
      <ChromaticRule className="mx-auto max-w-[1400px] px-5 md:px-10" />
    </section>
  );
}

function FrameMock({ progress }: { progress: number }) {
  // A low-poly "video frame" stand-in that shifts with the timeline.
  const hue = 240 + progress * 120;
  const scanLines = Array.from({ length: 18 }, (_, i) => ({
    id: `scan-${i * 10}`,
    base: i * 10,
  }));
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Sample frame · timeline preview"
    >
      <title>Sample frame</title>
      <defs>
        <linearGradient id="frame-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`oklch(0.35 0.12 ${hue})`} />
          <stop offset="100%" stopColor="oklch(0.08 0.02 280)" />
        </linearGradient>
        <linearGradient id="frame-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.14 0.01 280)" />
          <stop offset="100%" stopColor="oklch(0.05 0 0)" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#frame-sky)" />
      <path
        d={`M 0 ${115 + Math.sin(progress * 6) * 6} Q 80 ${95 + Math.cos(progress * 5) * 8}, 160 ${110 + Math.sin(progress * 3) * 6} T 320 ${105 + Math.cos(progress * 4) * 8} L 320 180 L 0 180 Z`}
        fill="url(#frame-ground)"
      />
      {/* subject silhouette */}
      <ellipse
        cx={130 + progress * 60}
        cy={95}
        rx={32}
        ry={38}
        fill="oklch(0.18 0.02 280)"
      />
      <circle
        cx={130 + progress * 60}
        cy={62}
        r={14}
        fill="oklch(0.22 0.02 280)"
      />
      {/* subtle scanline shimmer */}
      {scanLines.map((sl) => {
        const y = sl.base + ((progress * 180) % 10);
        return (
          <line
            key={sl.id}
            x1="0"
            x2="320"
            y1={y}
            y2={y}
            stroke="oklch(1 0 0)"
            strokeOpacity="0.03"
            strokeWidth="0.5"
          />
        );
      })}
      {/* timecode overlay */}
      <text
        x="12"
        y="170"
        fontFamily="var(--font-geist-mono)"
        fontSize="9"
        letterSpacing="1.5"
        fill="oklch(0.95 0 0 / 0.7)"
      >
        REC · 00:{String(Math.floor(progress * 30)).padStart(2, "0")}
      </text>
    </svg>
  );
}

function SchematicCortex({
  frame,
  progress,
}: {
  frame: (typeof FRAMES)[number];
  progress: number;
}) {
  // Anchor points on the new brain anatomy (viewBox 0 0 520 300, brain
  // facing left: frontal ~x=120, occipital ~x=430).
  const ANCHORS: Record<string, [number, number]> = {
    G_occipital_sup: [400, 170],
    G_amygdala_L: [240, 240],
    G_nucleus_accumbens: [205, 185],
    "G_front_inf-Opercular": [180, 160],
    G_front_sup: [155, 110],
  };
  const [ax, ay] = ANCHORS[frame.region] ?? [220, 180];
  const intensity = frame.activation;

  return (
    <svg
      viewBox="0 0 520 300"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Cortex activation at frame · ${frame.dominant}`}
    >
      <title>Cortex activation · {frame.dominant}</title>
      <defs>
        <radialGradient id="demo-fill" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="oklch(0.18 0.02 280)" />
          <stop offset="100%" stopColor="oklch(0.07 0 0)" />
        </radialGradient>
        <radialGradient id="hot-pulse" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="oklch(0.72 0.22 30)"
            stopOpacity="0.95"
          />
          <stop
            offset="60%"
            stopColor="oklch(0.72 0.22 30)"
            stopOpacity="0.3"
          />
          <stop offset="100%" stopColor="oklch(0.72 0.22 30)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Sagittal brain — same anatomy as HeroSpecimen, scaled to fit the
          520×300 viewBox (~0.75× of the hero's 520×420). */}
      <g transform="translate(0 -20) scale(1, 0.75) translate(0 20)">
        <path
          d="M 70 210 C 60 170, 75 120, 120 92 C 165 62, 235 55, 295 68 C 355 80, 405 110, 430 155 C 450 195, 448 232, 430 262 C 418 284, 400 295, 380 298 C 392 308, 402 324, 398 344 C 394 360, 378 368, 358 364 C 345 362, 335 354, 328 344 C 318 352, 302 354, 288 348 C 268 354, 238 354, 210 346 C 180 338, 150 322, 130 296 C 112 272, 92 248, 82 232 C 72 222, 68 215, 70 210 Z"
          fill="url(#demo-fill)"
          stroke="oklch(0.3 0.03 280)"
          strokeWidth="1"
        />
        <path
          d="M 340 300 C 340 288, 355 280, 375 282 C 392 284, 402 296, 398 314 C 395 328, 382 336, 365 334 C 348 332, 340 320, 340 300 Z"
          fill="url(#demo-fill)"
          stroke="oklch(0.32 0.04 280)"
          strokeWidth="0.75"
        />
        <path
          d="M 320 340 C 322 352, 322 366, 320 380"
          fill="none"
          stroke="oklch(0.32 0.04 280)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 218 98 Q 232 165, 246 235 Q 254 278, 262 310"
          fill="none"
          stroke="oklch(0.45 0.05 280)"
          strokeOpacity="0.6"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M 140 240 Q 210 240, 280 258 Q 330 268, 360 270"
          fill="none"
          stroke="oklch(0.45 0.05 280)"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <g
          fill="none"
          stroke="oklch(0.4 0.04 280)"
          strokeOpacity="0.5"
          strokeWidth="0.65"
        >
          <path d="M 105 180 Q 135 155, 175 150 Q 215 145, 250 155" />
          <path d="M 95 205 Q 130 185, 172 182 Q 218 180, 258 190" />
          <path d="M 125 275 Q 165 268, 210 272 Q 250 278, 288 290" />
          <path d="M 290 128 Q 325 138, 358 160 Q 392 180, 418 205" />
          <path d="M 308 158 Q 340 170, 368 190 Q 398 210, 420 235" />
        </g>
      </g>
      <circle
        cx={ax}
        cy={ay}
        r={10 + intensity * 40}
        fill="url(#hot-pulse)"
        style={{ transition: "all 300ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      />
      <circle
        cx={ax}
        cy={ay}
        r={3 + intensity * 3}
        fill="oklch(1 0 0)"
        style={{ transition: "all 300ms ease" }}
      />
      <line
        x1="0"
        x2="520"
        y1={ay}
        y2={ay}
        stroke="oklch(0.97 0 0 / 0.15)"
        strokeDasharray="2 4"
        strokeWidth="0.5"
      />
      <line
        y1="0"
        y2="300"
        x1={ax}
        x2={ax}
        stroke="oklch(0.97 0 0 / 0.15)"
        strokeDasharray="2 4"
        strokeWidth="0.5"
      />
      <text
        x={ax + 8}
        y={ay - 14}
        fontFamily="var(--font-geist-mono)"
        fontSize="8"
        letterSpacing="1"
        fill="oklch(0.72 0.22 30)"
      >
        {frame.dominant.toUpperCase()}
      </text>
      <text
        x={ax + 8}
        y={ay - 4}
        fontFamily="var(--font-geist-mono)"
        fontSize="7"
        letterSpacing="1"
        fill="oklch(0.72 0 0)"
      >
        σ {frame.sigma.replace("+", "+")}
      </text>
      {/* progress bar along bottom — thin, muted so it doesn't compete
          with the activation glow. */}
      <rect x="0" y="295" width="520" height="1.5" fill="oklch(0.13 0 0)" />
      <rect
        x="0"
        y="295"
        width={520 * progress}
        height="1.5"
        fill="oklch(0.82 0.18 160)"
        fillOpacity="0.55"
      />
    </svg>
  );
}

function TimelineSparkline({ progress }: { progress: number }) {
  // Build a deterministic activation curve that peaks at each FRAMES anchor.
  const width = 1000;
  const height = 80;
  const points: string[] = [];
  for (let x = 0; x <= width; x += 4) {
    const t = x / width;
    let val = 0;
    for (const f of FRAMES) {
      const d = Math.abs(t - f.t);
      val += f.activation * Math.exp(-(d * d) / 0.004);
    }
    val = Math.min(1, val);
    const y = height - val * (height - 8) - 4;
    points.push(`${x},${y}`);
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Activation timeline sparkline"
    >
      <title>Activation timeline</title>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.22 30 / 0.5)" />
          <stop offset="100%" stopColor="oklch(0.72 0.22 30 / 0)" />
        </linearGradient>
      </defs>
      {/* Horizontal grid */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={`h-${r}`}
          x1="0"
          x2={width}
          y1={height * r}
          y2={height * r}
          stroke="oklch(0.22 0 0)"
          strokeDasharray="2 4"
          strokeWidth="0.5"
        />
      ))}
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill="url(#spark-fill)"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="oklch(0.72 0.22 30)"
        strokeWidth="1.5"
      />
      {FRAMES.map((f) => {
        const x = f.t * width;
        const y = height - f.activation * (height - 8) - 4;
        return (
          <circle
            key={`pk-${f.t}`}
            cx={x}
            cy={y}
            r={2.5}
            fill="oklch(0.82 0.18 160)"
          />
        );
      })}
      <line
        x1={progress * width}
        x2={progress * width}
        y1="0"
        y2={height}
        stroke="oklch(0.97 0 0)"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}
