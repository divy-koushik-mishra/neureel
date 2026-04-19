"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Brain, RefreshCcw } from "lucide-react";
import { BrainRegionsTable } from "@/components/BrainRegionsTable";
import { BrainViewer } from "@/components/BrainViewer";
import { normalizeRawOutput, Playground } from "@/components/Playground";
import { Recommendations } from "@/components/Recommendations";
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
    return <LoadingState message="Fetching job…" />;
  }

  if (job.isError || !job.data) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
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

  if (j.status === "PENDING" || j.status === "PROCESSING") {
    return (
      <LoadingState
        message={
          j.status === "PENDING"
            ? "Queued for analysis…"
            : "Running TRIBE v2 on GPU — brain activation incoming…"
        }
        subtle={j.fileName}
      />
    );
  }

  if (j.status === "FAILED") {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertTriangle className="size-6 text-rose-400" />
        <p className="text-sm font-medium">Analysis failed</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {j.errorMessage ?? "The inference job encountered an error."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => job.refetch()}
          className="mt-2"
        >
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </Card>
    );
  }

  // COMPLETED
  const regions = normalizeRegions(j.brainRegions);
  const score = j.viralityScore ?? 0;
  const raw = normalizeRawOutput(j.rawOutput);
  const activationMap = normalizeActivationMap(j.activationMap);

  return (
    <div className="flex flex-col gap-6">
      {j.note ? <DemoNoteBanner note={j.note} /> : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ViralityScoreCard score={score} />
        <BrainViewer regions={regions} activationMap={activationMap} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-2">
          <BrainRegionsTable regions={regions} />
        </Card>
        <Recommendations regions={regions} />
      </section>

      {raw ? <Playground raw={raw} /> : null}
    </div>
  );
}

function DemoNoteBanner({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <span className="mt-[2px] inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-400">
        β
      </span>
      <div>
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

function LoadingState({
  message,
  subtle,
}: {
  message: string;
  subtle?: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <div className="animate-brain-pulse flex size-16 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Brain className="size-8" />
      </div>
      <p className="text-sm font-medium">{message}</p>
      {subtle ? (
        <p className="text-xs text-muted-foreground">{subtle}</p>
      ) : null}
    </Card>
  );
}

function normalizeActivationMap(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  // Fast path: all numbers already.
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
