export function AuthorityStrip() {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--rule)] bg-[color:var(--paper)]/60">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-2 items-center gap-6 px-4 py-10 sm:px-5 sm:py-12 md:grid-cols-[auto_1fr_auto] md:gap-16 md:px-10 md:py-14">
        <Stat label="subjects" value="80" sub="human cortices" />
        <Stat
          label="volumes"
          value="72 M"
          sub="BOLD signals"
          align="right"
          className="md:order-3"
        />
        <p className="col-span-2 text-center font-display text-[clamp(1.2rem,2.4vw,2rem)] font-light leading-[1.35] tracking-[-0.01em] text-foreground md:col-span-1 md:order-2">
          <span className="text-muted-foreground">Trained on </span>
          <span
            className="italic"
            style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
          >
            1,000&#8239;+ hours
          </span>
          <span className="text-muted-foreground"> of functional MRI, </span>
          <br className="hidden md:block" />
          <span className="text-muted-foreground">spanning </span>
          <span
            className="italic"
            style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
          >
            every major lobe
          </span>
          <span className="text-muted-foreground"> of the human cortex.</span>
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px signal-gradient opacity-40" />
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  align = "left",
  className,
}: {
  label: string;
  value: string;
  sub: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${
        align === "right"
          ? "items-end text-right md:items-end md:text-right"
          : ""
      } ${className ?? ""}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80 sm:tracking-[0.28em]">
        {label}
      </span>
      <span
        className="font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-none tracking-[-0.02em] text-foreground"
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80 sm:tracking-[0.28em]">
        {sub}
      </span>
    </div>
  );
}
