import { InstrumentFrame } from "./InstrumentFrame";

export function Method() {
  return (
    <section
      id="method"
      className="relative border-b border-[color:var(--rule)]"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-16 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 01 / method
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              Three instruments.
              <br />
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                One continuous loop.
              </span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-[1.6] text-muted-foreground sm:mt-5 sm:text-[16px]">
              Content goes in, activation comes out, recommendations flow back.
              The whole cycle runs faster than you can rewatch the clip.
            </p>
          </div>
        </header>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          <ConnectorLine className="absolute left-[33.3%] top-[44%] hidden md:block" />
          <ConnectorLine className="absolute left-[66.6%] top-[44%] hidden md:block" />

          <Panel
            step="01"
            code="ingest"
            title="Upload"
            body="Drop a reel, an ad, a thumbnail. We stream it through preprocessing — temporal resample, spatial norm, frame tokenization — and route it to the GPU."
            visual={<WaveformVisual />}
            meta="~0.8 s · S3 presigned"
          />
          <Panel
            step="02"
            code="infer"
            title="Predict"
            body="TRIBE v2 predicts per-vertex BOLD response across 163,842 cortical locations, then aggregates into six engagement-relevant regions."
            visual={<VertexVisual />}
            meta="~847 ms · 1,024 ch"
            accent
          />
          <Panel
            step="03"
            code="act"
            title="Recommend"
            body="A score, six region weights, and copy-ready edit suggestions. Re-cut, re-score, iterate — each pass under a second."
            visual={<DialVisual />}
            meta="realtime · 0–100"
          />
        </div>
      </div>
    </section>
  );
}

function Panel({
  step,
  code,
  title,
  body,
  visual,
  meta,
  accent,
}: {
  step: string;
  code: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  meta: string;
  accent?: boolean;
}) {
  return (
    <InstrumentFrame
      label={`${step} / ${code}`}
      readout={
        accent ? (
          <span className="text-[color:var(--signal-bio)]">active</span>
        ) : (
          <span>ready</span>
        )
      }
      caption={<span className="opacity-70">{meta}</span>}
    >
      <div className="flex flex-col gap-4 p-5 sm:gap-5 sm:p-6 md:p-7">
        <div className="flex h-24 items-center justify-center overflow-hidden sm:h-28">
          {visual}
        </div>
        <h3
          className="font-display text-[1.75rem] leading-none tracking-[-0.02em] text-foreground sm:text-[2rem]"
          style={{ fontVariationSettings: "'opsz' 40" }}
        >
          {title}
        </h3>
        <p className="text-[14px] leading-[1.6] text-muted-foreground sm:text-[14.5px]">
          {body}
        </p>
      </div>
    </InstrumentFrame>
  );
}

function ConnectorLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 10"
      role="presentation"
      aria-label="flow connector"
      className={`h-2 w-10 -translate-x-1/2 ${className ?? ""}`}
      fill="none"
      stroke="oklch(0.5 0 0)"
      strokeWidth="0.5"
      strokeDasharray="2 3"
    >
      <title>flow connector</title>
      <path d="M0 5 L32 5" />
      <path d="M30 1 L34 5 L30 9" />
    </svg>
  );
}

function WaveformVisual() {
  const bars = Array.from({ length: 44 }, (_, i) => {
    const h = 10 + Math.abs(Math.sin(i * 0.7) * 30) + (i % 5) * 3;
    const x = 4 + i * 5;
    return { id: `bar-${x}`, x, h, opacity: 0.3 + (i % 9) * 0.07 };
  });
  return (
    <svg
      viewBox="0 0 220 90"
      className="h-full w-full"
      role="img"
      aria-label="Upload waveform"
    >
      <title>Upload waveform</title>
      {bars.map((b) => (
        <rect
          key={b.id}
          x={b.x}
          y={45 - b.h / 2}
          width="2"
          height={b.h}
          fill="oklch(0.7 0 0)"
          opacity={b.opacity}
        />
      ))}
      <line
        x1="0"
        x2="220"
        y1="45"
        y2="45"
        stroke="oklch(0.82 0.18 160)"
        strokeWidth="0.5"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

function VertexVisual() {
  const vertices: {
    id: string;
    x: number;
    y: number;
    intensity: number;
  }[] = [];
  for (let col = 0; col < 14; col++) {
    for (let row = 0; row < 6; row++) {
      const x = 8 + col * 15;
      const y = 10 + row * 13;
      const d = Math.hypot(x - 110, y - 45);
      vertices.push({
        id: `v-${x}-${y}`,
        x,
        y,
        intensity: Math.max(0, 1 - d / 80),
      });
    }
  }
  return (
    <svg
      viewBox="0 0 220 90"
      className="h-full w-full"
      role="img"
      aria-label="Cortical vertex field with central activation"
    >
      <title>Cortical vertex field</title>
      <defs>
        <radialGradient id="hotspot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.22 30)" stopOpacity="1" />
          <stop offset="100%" stopColor="oklch(0.72 0.22 30)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {vertices.map((v) => (
        <circle
          key={v.id}
          cx={v.x}
          cy={v.y}
          r={1.4}
          fill={
            v.intensity > 0.55
              ? "oklch(0.72 0.22 30)"
              : v.intensity > 0.3
                ? "oklch(0.7 0.15 60)"
                : "oklch(0.55 0.18 250)"
          }
          opacity={0.35 + v.intensity * 0.65}
        />
      ))}
      <circle cx="110" cy="45" r="28" fill="url(#hotspot)" opacity="0.6" />
    </svg>
  );
}

function DialVisual() {
  const score = 73;
  const circumference = 2 * Math.PI * 34;
  const dash = (score / 100) * circumference;
  const ticks = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2 - Math.PI / 2;
    const r2 = i % 5 === 0 ? 42 : 40;
    return {
      id: `tick-${i * 18}`,
      x1: 50 + Math.cos(a) * 38,
      y1: 50 + Math.sin(a) * 38,
      x2: 50 + Math.cos(a) * r2,
      y2: 50 + Math.sin(a) * r2,
    };
  });
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label={`Virality dial at ${score} of 100`}
    >
      <title>Virality score dial</title>
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="oklch(0.2 0 0)"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="oklch(0.82 0.18 160)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
      {ticks.map((t) => (
        <line
          key={t.id}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="oklch(0.4 0 0)"
          strokeWidth="0.5"
        />
      ))}
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontSize="20"
        fontFamily="var(--font-fraunces)"
        fill="oklch(0.97 0 0)"
        style={{ fontVariationSettings: "'opsz' 36" }}
      >
        {score}
      </text>
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontSize="5"
        letterSpacing="1"
        fontFamily="var(--font-geist-mono)"
        fill="oklch(0.62 0 0)"
      >
        VIRALITY
      </text>
    </svg>
  );
}
