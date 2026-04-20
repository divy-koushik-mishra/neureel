const ITEMS = [
  {
    q: "Is this actually neuroscience or just AI with a brain logo?",
    a: "TRIBE v2 is a foundation model trained directly on fMRI recordings — per-vertex BOLD response from subjects consuming naturalistic content. We predict cortical activation, then project it to engagement-relevant regions. The intermediate state is legibly neuroscientific, not a black-box embedding.",
  },
  {
    q: "Do I need a neuroscience background to read the output?",
    a: "No. You get a 0–100 score, six region bars, the frames where each region peaked, and concrete copy or edit suggestions. The neuroscience is the engine, not the dashboard.",
  },
  {
    q: "What kinds of content work?",
    a: "Short-form video (reels, ads, TikToks, shorts), thumbnails, static ad creative, and storyboard frames. Anything under 90 seconds routes end-to-end in seconds. Longer-form content runs in scene batches.",
  },
  {
    q: "How is the virality score calibrated?",
    a: "Against held-out human engagement data. We fit a weighted composite over the six regions and validate against real-world view-through, retention, and share behaviour. The weights are versioned and published.",
  },
  {
    q: "What do you do with uploaded content?",
    a: "Stored encrypted, inference-only, never used to train. You can delete any analysis from the dashboard and it's purged from storage. We don't sell data. Ever.",
  },
  {
    q: "Can I hook this into a creative pipeline?",
    a: "Yes. The same analysis is available via API. Drop a presigned URL, get the score, regions, peaks, and recommendations back as JSON. Typical latency is under one second per clip.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative border-b border-[color:var(--rule)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-5 sm:py-24 md:px-10 md:py-32">
        <header className="mb-10 grid grid-cols-1 gap-6 sm:mb-14 sm:gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            § 06 / questions
          </span>
          <div className="max-w-3xl">
            <h2 className="font-display text-[clamp(1.85rem,4.2vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em] text-foreground">
              Questions
              <span
                className="italic text-muted-foreground"
                style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
              >
                {" "}
                we expected.
              </span>
            </h2>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
          {ITEMS.map((item, i) => (
            <article key={item.q} className="group relative">
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70">
                  § {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-[color:var(--rule)]" />
              </div>
              <h3
                className="font-display text-[clamp(1.25rem,1.6vw,1.55rem)] leading-[1.25] tracking-[-0.01em] text-foreground"
                style={{ fontVariationSettings: "'opsz' 36, 'WONK' 1" }}
              >
                <span className="italic">{item.q}</span>
              </h3>
              <p className="mt-3 max-w-lg text-[15px] leading-[1.7] text-muted-foreground">
                {item.a}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
