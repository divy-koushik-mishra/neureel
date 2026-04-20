"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChromaticRule } from "./ChromaticRule";
import { HeroSpecimen } from "./HeroSpecimen";
import { InstrumentFrame } from "./InstrumentFrame";

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();

  const rise = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.7, ease: EASE },
        },
      };

  const container = reduce
    ? { hidden: {}, show: {} }
    : {
        hidden: {},
        show: {
          transition: { staggerChildren: 0.07, delayChildren: 0.1 },
        },
      };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 graph-paper opacity-30" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/15 blur-[140px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-10 px-4 pt-10 pb-16 sm:px-5 sm:gap-14 sm:pt-14 sm:pb-20 md:px-10 md:pt-24 md:pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center"
      >
        {/* LEFT: editorial headline block */}
        <div className="relative">
          <motion.div variants={rise}>
            <span className="inline-flex items-center gap-2 border border-[color:var(--rule)] bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-sm">
              <span className="size-1 animate-specimen-pulse rounded-full bg-[color:var(--signal-bio)]" />
              Meta · TRIBE v2 · cortical foundation model
            </span>
          </motion.div>

          <h1 className="mt-6 font-display font-light tracking-[-0.035em] text-foreground sm:mt-8">
            <motion.span
              variants={rise}
              className="block text-[clamp(2.1rem,7.5vw,5.25rem)] leading-[1.02]"
            >
              A foundation model
            </motion.span>
            <motion.span
              variants={rise}
              className="block text-[clamp(2.1rem,7.5vw,5.25rem)] leading-[1.02]"
            >
              of the cortex,
            </motion.span>
            <motion.span
              variants={rise}
              className="block text-[clamp(2.1rem,7.5vw,5.25rem)] leading-[1.02] italic text-muted-foreground"
              style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
            >
              now legible
            </motion.span>
            <motion.span
              variants={rise}
              className="block text-[clamp(2.1rem,7.5vw,5.25rem)] leading-[1.02] italic text-foreground"
              style={{ fontVariationSettings: "'WONK' 1, 'SOFT' 100" }}
            >
              to marketers.
            </motion.span>
          </h1>

          <motion.p
            variants={rise}
            className="mt-5 max-w-lg text-[15px] leading-[1.6] text-muted-foreground sm:mt-7 sm:text-[17px]"
          >
            Neureel renders every video, every frame, as cortical activation —
            then returns a virality score you can actually act on.
            <span className="text-foreground"> No guessing. No proxies.</span>{" "}
            Just the brain, observed.
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-7 flex flex-wrap items-center gap-4 sm:mt-9 sm:gap-5"
          >
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "brand", size: "lg" }),
                "rounded-sm px-6 font-medium",
              )}
            >
              Analyze a reel
              <ArrowGlyph />
            </Link>
            <Link
              href="#science"
              className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="inline-block h-px w-8 bg-current opacity-60 transition-all group-hover:w-12" />
              read the science
            </Link>
          </motion.div>

          <motion.div
            variants={rise}
            className="mt-8 grid max-w-lg grid-cols-3 gap-0 border-y border-[color:var(--rule)] py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:mt-10 sm:py-4 sm:tracking-[0.28em]"
          >
            <DataCell label="training" value="1,000 hrs" sub="fMRI" />
            <DataCell
              label="resolution"
              value="163,842"
              sub="vertices"
              accent
            />
            <DataCell label="latency" value="847 ms" sub="median" />
          </motion.div>
        </div>

        {/* RIGHT: specimen instrument */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.15 }}
          className="relative"
        >
          <InstrumentFrame
            label="specimen · 001"
            readout={
              <span className="inline-flex items-center gap-2">
                <span className="size-1 animate-specimen-pulse rounded-full bg-[color:var(--signal-bio)]" />
                live
              </span>
            }
            caption={
              <>
                <span>plate · a1</span>
                <span className="opacity-70">destrieux · 74 regions</span>
              </>
            }
          >
            <HeroSpecimen />
          </InstrumentFrame>
        </motion.div>
      </motion.div>

      <ChromaticRule className="mx-auto max-w-[1400px] px-5 md:px-10" />
    </section>
  );
}

function DataCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-2 first:pl-0 not-last:border-r not-last:border-[color:var(--rule)] sm:px-3">
      <span className="text-[9px] text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          "font-display text-[15px] tracking-tight sm:text-xl",
          accent ? "text-[color:var(--signal-bio)]" : "text-foreground",
        )}
        style={{ fontVariationSettings: "'opsz' 36" }}
      >
        {value}
      </span>
      <span className="text-[9px] text-muted-foreground/70">{sub}</span>
    </div>
  );
}

function ArrowGlyph() {
  return (
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
  );
}
