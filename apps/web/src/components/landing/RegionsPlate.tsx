import { InstrumentFrame } from "./InstrumentFrame";

const REGIONS = [
  {
    plate: "I",
    name: "Nucleus Accumbens",
    code: "G_nucleus_accumbens",
    fn: "Reward & Dopamine Response",
    body: "The reward engine. Lights up when the viewer wants what they see — the click, the buy, the share.",
    weight: 0.25,
    hot: 0.82,
    color: "oklch(0.72 0.22 30)",
    position: { cx: 44, cy: 58, r: 8 },
  },
  {
    plate: "II",
    name: "Amygdala",
    code: "G_amygdala_L",
    fn: "Emotional Arousal",
    body: "The emotional alarm. Fires on threat, surprise, tenderness — the feelings that stop the scroll mid-flick.",
    weight: 0.2,
    hot: 0.71,
    color: "oklch(0.7 0.22 15)",
    position: { cx: 50, cy: 66, r: 7 },
  },
  {
    plate: "III",
    name: "Primary Visual Cortex",
    code: "G_occipital_sup",
    fn: "Visual Attention",
    body: "The retinal echo. High activation means the frame is visually resolved — readable, composed, alive.",
    weight: 0.2,
    hot: 0.68,
    color: "oklch(0.75 0.2 60)",
    position: { cx: 82, cy: 48, r: 12 },
  },
  {
    plate: "IV",
    name: "Dorsolateral PFC",
    code: "G_front_sup",
    fn: "Decision Making",
    body: "The deliberative cortex. Peaks when the viewer is actively weighing something — claim, proposition, CTA.",
    weight: 0.15,
    hot: 0.63,
    color: "oklch(0.65 0.18 280)",
    position: { cx: 28, cy: 32, r: 12 },
  },
  {
    plate: "V",
    name: "Insula",
    code: "G_insular_short",
    fn: "Social Emotion",
    body: "The empathy circuit. Active when the viewer co-feels with whoever's on screen.",
    weight: 0.1,
    hot: 0.55,
    color: "oklch(0.7 0.2 340)",
    position: { cx: 54, cy: 46, r: 7 },
  },
  {
    plate: "VI",
    name: "Broca's Area",
    code: "G_front_inf-Opercular",
    fn: "Language & Narrative",
    body: "The linguistic cortex. Copy, voiceover, captions — this region tells you whether the words landed.",
    weight: 0.1,
    hot: 0.58,
    color: "oklch(0.7 0.22 100)",
    position: { cx: 35, cy: 50, r: 8 },
  },
];

export function RegionsPlate() {
  return (
    <section className="relative border-b border-[color:var(--rule)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 03 / atlas
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              Six regions that
              <br />
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                drive the feed.
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-muted-foreground sm:mt-5 sm:text-[16px]">
              Your virality score is a weighted composite. Each plate shows the
              region, its cortical address, and its contribution to the signal.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((r) => (
            <InstrumentFrame
              key={r.code}
              label={`plate · ${r.plate}`}
              readout={
                <span className="font-mono">w · {r.weight.toFixed(2)}</span>
              }
              caption={
                <>
                  <span className="opacity-80">{r.code}</span>
                  <span style={{ color: r.color }} className="font-mono">
                    +{r.hot.toFixed(2)} σ
                  </span>
                </>
              }
            >
              <div className="flex flex-col gap-4 p-5">
                <MiniBrain region={r} />
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {r.fn}
                  </span>
                  <h3
                    className="mt-1 font-display text-[1.6rem] leading-[1.1] tracking-[-0.015em] text-foreground"
                    style={{ fontVariationSettings: "'opsz' 36" }}
                  >
                    {r.name}
                  </h3>
                </div>
                <p className="text-[13.5px] leading-[1.55] text-muted-foreground">
                  {r.body}
                </p>
              </div>
            </InstrumentFrame>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniBrain({ region }: { region: (typeof REGIONS)[number] }) {
  const { cx, cy, r } = region.position;
  const vLines = Array.from({ length: 8 }, (_, i) => ({
    id: `gv-${i * 12.5}`,
    x: i * 12.5,
  }));
  const hLines = Array.from({ length: 6 }, (_, i) => ({
    id: `gh-${i * 12.5}`,
    y: i * 12.5,
  }));
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-[color:var(--rule)] bg-[color:var(--paper)]">
      <svg
        viewBox="0 0 100 75"
        className="h-full w-full"
        role="img"
        aria-label={`Plate ${region.plate} · ${region.name}`}
      >
        <title>
          Plate {region.plate} · {region.name}
        </title>
        <defs>
          <radialGradient id={`rf-${region.code}`} cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="oklch(0.16 0.02 280)" />
            <stop offset="100%" stopColor="oklch(0.07 0 0)" />
          </radialGradient>
          <radialGradient id={`rh-${region.code}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={region.color} stopOpacity="0.9" />
            <stop offset="70%" stopColor={region.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={region.color} stopOpacity="0" />
          </radialGradient>
        </defs>
        {vLines.map((l) => (
          <line
            key={l.id}
            x1={l.x}
            x2={l.x}
            y1="0"
            y2="75"
            stroke="oklch(0.97 0 0 / 0.04)"
            strokeWidth="0.3"
          />
        ))}
        {hLines.map((l) => (
          <line
            key={l.id}
            x1="0"
            x2="100"
            y1={l.y}
            y2={l.y}
            stroke="oklch(0.97 0 0 / 0.04)"
            strokeWidth="0.3"
          />
        ))}
        <path
          d="M 22 42 C 22 22, 35 10, 55 8 C 75 6, 87 18, 88 36 C 88 52, 78 62, 64 64 C 50 66, 35 64, 28 58 C 22 54, 22 48, 22 42 Z"
          fill={`url(#rf-${region.code})`}
          stroke="oklch(0.35 0.03 280)"
          strokeWidth="0.5"
        />
        <g
          fill="none"
          stroke="oklch(0.45 0.04 280)"
          strokeOpacity="0.5"
          strokeWidth="0.3"
        >
          <path d="M 30 40 Q 45 32, 60 34 T 82 30" />
          <path d="M 32 52 Q 50 48, 68 52 T 84 46" />
          <path d="M 52 15 Q 50 35, 52 58" />
        </g>
        <circle cx={cx} cy={cy} r={r * 1.8} fill={`url(#rh-${region.code})`} />
        <circle cx={cx} cy={cy} r={1.4} fill="oklch(1 0 0)" />
        <line
          x1={cx}
          x2={cx + 18}
          y1={cy}
          y2={cy - 10}
          stroke="oklch(0.97 0 0 / 0.45)"
          strokeWidth="0.3"
        />
        <text
          x={cx + 19}
          y={cy - 10}
          fontFamily="var(--font-geist-mono)"
          fontSize="3.5"
          letterSpacing="0.4"
          fill="oklch(0.97 0 0 / 0.7)"
        >
          {region.plate}
        </text>
      </svg>
      <div className="absolute bottom-1.5 left-2 font-mono text-[8px] uppercase tracking-[0.28em] text-muted-foreground/70">
        sagittal · schematic
      </div>
    </div>
  );
}
