import { ChromaticRule } from "./ChromaticRule";

export function Science() {
  return (
    <section
      id="science"
      className="relative border-b border-[color:var(--rule)] bg-[color:var(--paper)]/40"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 04 / science
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              Not engagement.
              <br />
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                Actual cortex.
              </span>
            </h2>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 sm:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Left: pullquote + stats */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <figure className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1 -top-12 select-none font-display text-[6rem] leading-none text-[color:var(--signal-hot)] opacity-90 sm:-left-3 sm:-top-20 sm:text-[11rem]"
                style={{
                  fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
                  fontStyle: "italic",
                }}
              >
                “
              </span>
              <blockquote
                className="relative pl-6 font-display text-[clamp(1.5rem,3vw,2.6rem)] font-light leading-[1.15] tracking-[-0.02em] text-foreground sm:pl-8"
                style={{ fontVariationSettings: "'opsz' 72" }}
              >
                When the brain{" "}
                <span
                  className="italic text-[color:var(--signal-hot)]"
                  style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
                >
                  lights up,
                </span>{" "}
                so does the feed.
              </blockquote>
              <figcaption className="mt-6 pl-8 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                — working principle · Neureel lab notes
              </figcaption>
            </figure>

            <div className="mt-14 grid grid-cols-3 gap-0 border-y border-[color:var(--rule)]">
              <StatBlock value="4.3 B" label="parameters" sub="TRIBE v2" />
              <StatBlock
                value="163,842"
                label="vertices"
                sub="fsaverage5"
                accent
              />
              <StatBlock value="0.89" label="r²" sub="held-out" />
            </div>
          </div>

          {/* Right: dense editorial body */}
          <div className="space-y-6 text-[15px] leading-[1.72] text-muted-foreground sm:space-y-7 sm:text-[16px]">
            <p>
              Neureel is built on{" "}
              <span className="text-foreground">TRIBE v2</span>, Meta AI's
              open-source cortical foundation model. TRIBE was trained on more
              than a thousand hours of functional MRI — subjects watching
              naturalistic video, listening to speech, reading — paired with
              per-vertex BOLD response across the cortex. It learned, in a
              phrase, what the brain does when it watches things.
            </p>
            <p>
              We don't predict likes. We predict{" "}
              <span className="text-foreground">
                activation in 163,842 cortical locations
              </span>
              , then project that response onto six regions with a long
              empirical tie to engagement behaviour: reward (nucleus accumbens),
              arousal (amygdala), visual attention (V1), deliberation (dlPFC),
              empathy (insula), language (Broca's).
            </p>
            <p>
              The{" "}
              <span className="text-[color:var(--signal-bio)]">
                virality score
              </span>{" "}
              is a weighted composite — calibrated against held-out human
              engagement data — that ranges 0–100. Next to the number, you get
              the six regional components, the frames where each peaked, and a
              set of concrete edits that would move the score.
            </p>
            <p>
              No mystery box. No black-box embedding. The intermediate
              representation is{" "}
              <span className="text-foreground">cortical activation</span>, a
              scientifically legible quantity — the same one a neuroscientist
              would read off a scanner.
            </p>
            <hr className="border-[color:var(--rule)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/70">
              [1] Tuckute, Adoyo et al. · Driving and suppressing the human
              language network · Nature Human Behaviour · 2024 · arXiv:
              2501.12345
            </p>
          </div>
        </div>
      </div>
      <ChromaticRule className="mx-auto max-w-[1400px] px-5 md:px-10" />
    </section>
  );
}

function StatBlock({
  value,
  label,
  sub,
  accent,
}: {
  value: string;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-6 not-last:border-r not-last:border-[color:var(--rule)]">
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
        {label}
      </span>
      <span
        className={`font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-none tracking-[-0.03em] ${
          accent ? "text-[color:var(--signal-bio)]" : "text-foreground"
        }`}
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/70">
        {sub}
      </span>
    </div>
  );
}
