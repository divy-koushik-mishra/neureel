"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { UploadZone } from "@/components/UploadZone";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function DashboardClient() {
  const trpc = useTRPC();
  const jobs = useQuery({
    ...trpc.jobs.list.queryOptions(),
    refetchInterval: 10_000,
  });

  return (
    <div className="flex flex-col gap-10">
      <UploadZone />

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent analyses
          </h2>
          {jobs.data ? (
            <span className="text-xs text-muted-foreground">
              {jobs.data.length} {jobs.data.length === 1 ? "job" : "jobs"}
            </span>
          ) : null}
        </div>

        {jobs.isPending ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              <Skeleton key={i} className="h-[68px] w-full" />
            ))}
          </div>
        ) : jobs.data && jobs.data.length > 0 ? (
          <div className="grid gap-2">
            {jobs.data.map((j) => (
              <JobCard
                key={j.id}
                job={{
                  id: j.id,
                  fileName: j.fileName,
                  inputType: j.inputType,
                  status: j.status,
                  viralityScore: j.viralityScore,
                  createdAt: new Date(j.createdAt),
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="size-5" />
            </div>
            <p className="text-sm font-medium">No analyses yet</p>
            <p className="text-xs text-muted-foreground">
              Upload your first video or image to get started.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
