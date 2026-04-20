import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChromaticRule } from "./ChromaticRule";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--rule)]">
      <div className="pointer-events-none absolute inset-0 graph-paper opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[160px]" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-start gap-8 px-4 py-20 sm:px-5 sm:gap-12 sm:py-28 md:px-10 md:py-40">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          § 07 / begin
        </span>

        <h2 className="font-display text-[clamp(2.5rem,8vw,7rem)] font-light leading-[0.98] tracking-[-0.035em] text-foreground">
          Look inside
          <br />
          <span
            className="italic"
            style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
          >
            your content.
          </span>
        </h2>

        <p className="max-w-xl text-[15px] leading-[1.6] text-muted-foreground sm:text-[17px]">
          Your first analysis is free. Upload a clip, see the cortex, take the
          score with you. No card, no sales call.
        </p>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "brand", size: "lg" }),
              "rounded-sm px-8 font-medium",
            )}
          >
            Begin analysis
            <svg
              viewBox="0 0 16 16"
              role="presentation"
              aria-label="arrow"
              className="ml-1 size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <title>arrow</title>
              <path d="M2 8h12M9 3l5 5-5 5" />
            </svg>
          </Link>
          <Link
            href="#method"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="inline-block h-px w-8 bg-current opacity-60 transition-all group-hover:w-12" />
            or revisit the method
          </Link>
        </div>

        <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-4 border-t border-[color:var(--rule)] pt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80 sm:mt-8 sm:gap-6 sm:tracking-[0.28em]">
          <span className="inline-flex items-center gap-2">
            <span className="size-1 animate-specimen-pulse rounded-full bg-[color:var(--signal-bio)]" />
            model · tribe_v2 · 4.3b params
          </span>
          <span>free first analysis</span>
          <span>realtime inference · 847 ms</span>
          <span>destrieux · 74 regions</span>
        </div>
      </div>
      <ChromaticRule className="mx-auto max-w-[1400px] px-5 md:px-10" />
    </section>
  );
}
