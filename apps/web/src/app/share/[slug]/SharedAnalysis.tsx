"use client";

import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { BrainRegionsTable } from "@/components/BrainRegionsTable";
import { BrainViewer } from "@/components/BrainViewer";
import { MediaPreview } from "@/components/MediaPreview";
import { normalizeRawOutput, Playground } from "@/components/Playground";
import { Recommendations } from "@/components/Recommendations";
import { Replay } from "@/components/Replay";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViralityScoreCard } from "@/components/ViralityScoreCard";
import type { BrainRegion } from "@/lib/scoring";
import { useTRPC } from "@/trpc/client";

export function SharedAnalysis({ slug }: { slug: string }) {
  const trpc = useTRPC();
  const job = useQuery(trpc.jobs.getPublicBySlug.queryOptions({ slug }));

  if (job.isPending) {
    return <LoadingState />;
  }

  if (job.isError || !job.data) {
    return <NotFoundState />;
  }

  const j = job.data;
  const createdAt = new Date(j.createdAt);
  const completedAt = j.completedAt ? new Date(j.completedAt) : null;
  const regions = normalizeRegions(j.brainRegions);
  const score = j.viralityScore ?? 0;
  const raw = normalizeRawOutput(j.rawOutput);
  const activationMap = normalizeActivationMap(j.activationMap);
  const sharedBy = j.user?.name ?? "a Neureel user";

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-400">
            <Globe className="size-3" />
            Shared analysis
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {j.fileName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Shared by {sharedBy}
            <span className="mx-1.5 text-border">·</span>
            Submitted {formatDistanceToNow(createdAt, { addSuffix: true })}
            {completedAt ? (
              <>
                <span className="mx-1.5 text-border">·</span>
                Finished {format(completedAt, "MMM d, HH:mm")}
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "brand", size: "sm" })}
        >
          Analyze your content
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {j.note ? <DemoNoteBanner note={j.note} /> : null}

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <MediaPreview
          fileUrl={j.fileUrl ?? null}
          fileName={j.fileName}
          inputType={j.inputType}
        />
        <ViralityScoreCard score={score} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          eyebrow="Brain activation"
          title="Where attention fires"
          sub="Drag to rotate · scroll to zoom"
        />
        <BrainViewer regions={regions} activationMap={activationMap} />
      </section>

      {raw ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            eyebrow="Replay"
            title="Frame-by-frame playback"
            sub="Watch the brain track the video, second by second"
          />
          <Replay
            fileUrl={j.fileUrl ?? null}
            fileName={j.fileName}
            inputType={j.inputType}
            fallbackActivation={activationMap}
            rawOutput={raw}
          />
        </section>
      ) : null}

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <SectionHeader eyebrow="Region breakdown" title="Tracked regions" />
          <Card className="overflow-hidden p-0">
            <BrainRegionsTable regions={regions} />
          </Card>
        </div>
        <div className="flex flex-col gap-3">
          <SectionHeader eyebrow="Playbook" title="Edit suggestions" />
          <Recommendations regions={regions} />
        </div>
      </section>

      {raw ? (
        <section className="flex flex-col gap-3">
          <SectionHeader
            eyebrow="Advanced"
            title="Timeseries & raw data"
            sub="Whole-brain trace, region heatmap, peak moments, Destrieux drilldown"
          />
          <Playground raw={raw} />
        </section>
      ) : null}

      <footer className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-6 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-brand/80">
          Want this for your content?
        </p>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
          Know why content goes viral. Before you publish.
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Neureel predicts brain-region activation from your videos and images,
          turning neuroscience into a virality score you can act on.
        </p>
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "brand", size: "lg" })}
        >
          Analyze your first reel
          <ArrowRight className="size-4" />
        </Link>
      </footer>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-brand/80">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </h2>
        {sub ? (
          <span className="text-xs text-muted-foreground">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

function DemoNoteBanner({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm sm:px-4">
      <span className="mt-[2px] inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-400">
        β
      </span>
      <div className="min-w-0">
        <p className="font-medium text-amber-200">Demo mode</p>
        <p className="mt-0.5 text-amber-100/80">{note}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <div className="size-10 animate-pulse-soft rounded-full bg-brand/20" />
      <p className="text-sm font-medium">Loading shared analysis…</p>
    </Card>
  );
}

function NotFoundState() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="size-6 text-rose-400" />
      <p className="text-sm font-medium">This link isn't active</p>
      <p className="max-w-md text-xs text-muted-foreground">
        The owner may have made it private, or the link is incorrect.
      </p>
      <Link
        href="/"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "mt-2",
        })}
      >
        Go home
      </Link>
    </Card>
  );
}

// Shared normalizers (same shape expected by BrainRegionsTable / BrainViewer)
function normalizeActivationMap(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out = new Array<number>(value.length);
  for (let i = 0; i < value.length; i++) {
    const v = value[i];
    if (typeof v !== "number") return null;
    out[i] = v;
  }
  return out;
}

function normalizeRegions(value: unknown): BrainRegion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      "activation" in item
    ) {
      const r = item as {
        name: unknown;
        activation: unknown;
        function?: unknown;
      };
      if (typeof r.name === "string" && typeof r.activation === "number") {
        return [
          {
            name: r.name,
            activation: r.activation,
            function: typeof r.function === "string" ? r.function : "",
          },
        ];
      }
    }
    return [];
  });
}
