"use client";

import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Brain, Loader2, RefreshCcw } from "lucide-react";
import { BrainRegionsTable } from "@/components/BrainRegionsTable";
import { BrainViewer } from "@/components/BrainViewer";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { MediaPreview } from "@/components/MediaPreview";
import { normalizeRawOutput, Playground } from "@/components/Playground";
import { Recommendations } from "@/components/Recommendations";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ViralityScoreCard } from "@/components/ViralityScoreCard";
import type { BrainRegion } from "@/lib/scoring";
import { useTRPC } from "@/trpc/client";

export function ResultsClient({ jobId }: { jobId: string }) {
  const trpc = useTRPC();
  const job = useQuery({
    ...trpc.jobs.getById.queryOptions({ id: jobId }),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "COMPLETED" || status === "FAILED") return false;
      return 5_000;
    },
  });

  if (job.isPending) {
    return <InitialLoadCard />;
  }

  if (job.isError || !job.data) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
        <AlertTriangle className="size-6 text-rose-400" />
        <p className="text-sm font-medium">Job not found</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {job.error?.message ??
            "This analysis doesn't exist or doesn't belong to your account."}
        </p>
      </Card>
    );
  }

  const j = job.data;
  const createdAt = new Date(j.createdAt);
  const completedAt = j.completedAt ? new Date(j.completedAt) : null;

  const isFailed = j.status === "FAILED";
  const isCompleted = j.status === "COMPLETED";

  const regions = isCompleted ? normalizeRegions(j.brainRegions) : [];
  const score = j.viralityScore ?? 0;
  const raw = isCompleted ? normalizeRawOutput(j.rawOutput) : null;
  const activationMap = isCompleted
    ? normalizeActivationMap(j.activationMap)
    : null;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <JobHeader
        fileName={j.fileName}
        status={j.status}
        createdAt={createdAt}
        completedAt={completedAt}
        jobId={j.id}
        isPublic={j.isPublic ?? false}
        publicSlug={j.publicSlug ?? null}
      />

      {j.note ? <DemoNoteBanner note={j.note} /> : null}

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <MediaPreview
          fileUrl={j.fileUrl}
          fileName={j.fileName}
          inputType={j.inputType}
        />
        {isCompleted ? (
          <ViralityScoreCard score={score} />
        ) : isFailed ? (
          <FailedCard message={j.errorMessage} onRetry={() => job.refetch()} />
        ) : (
          <AnalyzingCard
            status={j.status === "PROCESSING" ? "PROCESSING" : "PENDING"}
          />
        )}
      </section>

      {isCompleted ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeader
              eyebrow="Brain activation"
              title="Where attention fires"
              sub="Drag to rotate · scroll to zoom"
            />
            <BrainViewer regions={regions} activationMap={activationMap} />
          </section>

          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <SectionHeader
                eyebrow="Region breakdown"
                title="Tracked regions"
              />
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
        </>
      ) : null}
    </div>
  );
}

function JobHeader({
  fileName,
  status,
  createdAt,
  completedAt,
  jobId,
  isPublic,
  publicSlug,
}: {
  fileName: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: Date;
  completedAt: Date | null;
  jobId: string;
  isPublic: boolean;
  publicSlug: string | null;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Analysis
        </p>
        <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
          {fileName}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Submitted {formatDistanceToNow(createdAt, { addSuffix: true })}
          {completedAt ? (
            <>
              <span className="mx-1.5 text-border">·</span>
              Finished {format(completedAt, "MMM d, HH:mm")}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <JobStatusBadge status={status} />
        <ShareButton
          jobId={jobId}
          isPublic={isPublic}
          publicSlug={publicSlug}
          disabled={status !== "COMPLETED"}
        />
      </div>
    </header>
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
        <p className="mt-1 text-xs text-muted-foreground">
          Numbers below are synthetic while the real TRIBE v2 call is wired up.
          Pipeline shape and flow are production.
        </p>
      </div>
    </div>
  );
}

function AnalyzingCard({ status }: { status: "PENDING" | "PROCESSING" }) {
  const steps = [
    { key: "upload", label: "Uploaded to storage", done: true },
    {
      key: "queue",
      label: "Queued for GPU",
      done: status === "PROCESSING",
    },
    {
      key: "inference",
      label: "Running TRIBE v2 inference",
      done: false,
      active: status === "PROCESSING",
    },
    { key: "score", label: "Scoring & regions", done: false },
  ];

  return (
    <Card className="relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,oklch(0.75_0.17_275/0.18),transparent_55%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Live analysis
        </p>
        <div className="flex items-center gap-3">
          <div className="animate-brain-pulse flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Brain className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">
              {status === "PENDING" ? "Queued for analysis" : "Analysing now"}
            </p>
            <p className="text-xs text-muted-foreground">
              {status === "PENDING"
                ? "Waiting for a free GPU worker…"
                : "TRIBE v2 is reading your media — this can take 20–60s."}
            </p>
          </div>
        </div>
      </div>

      <ul className="relative mt-6 space-y-2.5 text-sm">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span
              className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                s.done
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                  : s.active
                    ? "border-brand/60 bg-brand/15 text-brand"
                    : "border-border bg-card"
              }`}
            >
              {s.done ? (
                <span className="size-1.5 rounded-full bg-emerald-400" />
              ) : s.active ? (
                <Loader2 className="size-2.5 animate-spin" />
              ) : null}
            </span>
            <span
              className={
                s.done
                  ? "text-foreground"
                  : s.active
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FailedCard({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight">
            Analysis failed
          </p>
          <p className="text-xs text-muted-foreground">
            The inference job encountered an error.
          </p>
        </div>
      </div>
      <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
        {message ?? "Unknown error"}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="self-start"
      >
        <RefreshCcw className="size-4" />
        Refresh
      </Button>
    </Card>
  );
}

function InitialLoadCard() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center sm:p-16">
      <div className="animate-brain-pulse flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand sm:size-16">
        <Brain className="size-7 sm:size-8" />
      </div>
      <p className="text-sm font-medium">Fetching job…</p>
    </Card>
  );
}

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
