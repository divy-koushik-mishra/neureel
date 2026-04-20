import { InstrumentFrame } from "./InstrumentFrame";

const CASES = [
  {
    plate: "A",
    audience: "Brand teams",
    headline: "Ship the cut that actually moves people.",
    body: "Compare three variants of a launch spot in under a minute. Score each on reward, arousal, and attention before it touches the media buy.",
    metric: "47",
    metricUnit: "creatives / wk",
  },
  {
    plate: "B",
    audience: "Creators",
    headline: "Know which frame earns the stop-scroll.",
    body: "Upload a rough cut. Neureel flags the first 1.5 seconds that win attention and the ones that leak it — before you publish.",
    metric: "↑2.3×",
    metricUnit: "hook retention",
  },
  {
    plate: "C",
    audience: "Agencies",
    headline: "Bring the brain to the pitch.",
    body: "Hand the client a report with cortical evidence, not taste. Every recommendation traces back to a region, a peak, a frame.",
    metric: "0.8 s",
    metricUnit: "score delta",
  },
];

export function UseCases() {
  return (
    <section
      id="audience"
      className="relative border-b border-[color:var(--rule)]"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 05 / audience
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              Who observes
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                {" "}
                with Neureel.
              </span>
            </h2>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CASES.map((c) => (
            <InstrumentFrame
              key={c.plate}
              label={`case · ${c.plate}`}
              readout={<span className="opacity-70">{c.audience}</span>}
            >
              <div className="flex h-full flex-col justify-between gap-8 p-5 sm:gap-10 sm:p-7">
                <h3
                  className="font-display text-[clamp(1.5rem,2vw,1.85rem)] leading-[1.2] tracking-[-0.015em] text-foreground"
                  style={{ fontVariationSettings: "'opsz' 36" }}
                >
                  {c.headline}
                </h3>
                <p className="text-[14.5px] leading-[1.6] text-muted-foreground">
                  {c.body}
                </p>
                <div className="flex items-baseline justify-between border-t border-[color:var(--rule)] pt-5">
                  <span
                    className="font-display text-[clamp(2rem,3.2vw,3rem)] leading-none tracking-[-0.02em] text-[color:var(--signal-bio)]"
                    style={{ fontVariationSettings: "'opsz' 72" }}
                  >
                    {c.metric}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {c.metricUnit}
                  </span>
                </div>
              </div>
            </InstrumentFrame>
          ))}
        </div>
      </div>
    </section>
  );
}
