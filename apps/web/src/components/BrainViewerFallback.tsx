import type { BrainRegion } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface RegionGeom {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  label: string;
}

// Schematic sagittal-ish layout — not anatomically precise, but gives each
// tracked region a consistent spatial home so activations map visually.
const REGION_GEOM: Record<string, RegionGeom> = {
  v1: { cx: 310, cy: 170, rx: 38, ry: 26, label: "V1" },
  amygdala: { cx: 170, cy: 215, rx: 22, ry: 18, label: "Amygdala" },
  nucleus_accumbens: {
    cx: 145,
    cy: 170,
    rx: 18,
    ry: 14,
    label: "N. Accumbens",
  },
  dlpfc: { cx: 95, cy: 110, rx: 40, ry: 28, label: "dlPFC" },
  insula: { cx: 190, cy: 150, rx: 20, ry: 18, label: "Insula" },
  brocas_area: { cx: 110, cy: 170, rx: 22, ry: 18, label: "Broca's" },
  hippocampus: { cx: 235, cy: 215, rx: 30, ry: 14, label: "Hippocampus" },
  motor_cortex: { cx: 170, cy: 85, rx: 48, ry: 22, label: "Motor Ctx" },
  tpj: { cx: 265, cy: 115, rx: 28, ry: 20, label: "TPJ" },
};

function tone(activation: number) {
  if (activation >= 0.7) return "#fb7185"; // rose-400
  if (activation >= 0.5) return "#fbbf24"; // amber-400
  if (activation >= 0.3) return "#38bdf8"; // sky-400
  return "#334155"; // slate-700
}

export function BrainViewerFallback({
  regions,
  className,
}: {
  regions: BrainRegion[];
  className?: string;
}) {
  const byName = new Map(regions.map((r) => [r.name, r.activation]));

  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-b from-card to-background",
        className,
      )}
    >
      <svg
        viewBox="0 0 400 300"
        role="img"
        aria-label="Schematic brain activation map"
        className="h-full w-full"
      >
        <defs>
          <radialGradient id="brainFill" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="oklch(0.2 0 0)" />
            <stop offset="100%" stopColor="oklch(0.12 0 0)" />
          </radialGradient>
        </defs>

        {/* Brain silhouette — sagittal profile facing left */}
        <path
          d="M 80 150
             C 80 80, 150 40, 230 50
             C 300 60, 340 100, 345 150
             C 350 195, 320 235, 275 245
             C 220 255, 170 255, 140 250
             C 100 242, 70 220, 70 190
             C 70 175, 75 160, 80 150 Z"
          fill="url(#brainFill)"
          stroke="oklch(0.3 0 0)"
          strokeWidth="1.5"
        />

        {/* Central sulcus hint */}
        <path
          d="M 180 60 Q 195 130 210 220"
          fill="none"
          stroke="oklch(0.25 0 0)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {Object.entries(REGION_GEOM).map(([key, geom]) => {
          const a = byName.get(key) ?? 0;
          return (
            <g key={key}>
              <ellipse
                cx={geom.cx}
                cy={geom.cy}
                rx={geom.rx}
                ry={geom.ry}
                fill={tone(a)}
                fillOpacity={0.15 + a * 0.7}
                stroke={tone(a)}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              <text
                x={geom.cx}
                y={geom.cy + 3}
                textAnchor="middle"
                fontSize="9"
                fill="oklch(0.95 0 0)"
                fontFamily="var(--font-sans)"
                opacity={a > 0.25 ? 1 : 0.6}
              >
                {geom.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-2 left-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        2D Schematic · WebGL unavailable
      </div>
    </div>
  );
}
