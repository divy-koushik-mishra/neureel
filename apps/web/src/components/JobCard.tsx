"use client";

import { formatDistanceToNow } from "date-fns";
import { FileImage, FileVideo } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getViralityLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { JobStatusBadge } from "./JobStatusBadge";

export interface JobCardData {
  id: string;
  fileName: string;
  inputType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  viralityScore: number | null;
  createdAt: Date;
}

const toneTextClass: Record<string, string> = {
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
  orange: "text-orange-400",
  rose: "text-rose-400",
};

export function JobCard({ job }: { job: JobCardData }) {
  const label =
    job.viralityScore != null ? getViralityLabel(job.viralityScore) : null;

  return (
    <Link href={`/dashboard/results/${job.id}`} className="block">
      <Card className="group flex items-center gap-3 p-3 transition-colors hover:border-brand/50 hover:bg-accent/30 sm:gap-4 sm:p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:size-10">
          {job.inputType === "video" ? (
            <FileVideo className="size-4 sm:size-5" />
          ) : (
            <FileImage className="size-4 sm:size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{job.fileName}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(job.createdAt), {
                addSuffix: true,
              })}
            </span>
            {job.viralityScore != null && label ? (
              <>
                <span className="text-border sm:hidden">·</span>
                <span
                  className={cn(
                    "tabular-nums sm:hidden",
                    toneTextClass[label.tone],
                  )}
                >
                  {job.viralityScore.toFixed(1)} · {label.label}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {job.viralityScore != null && label ? (
          <div className="hidden shrink-0 text-right sm:block">
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                toneTextClass[label.tone],
              )}
            >
              {job.viralityScore.toFixed(1)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label.label}
            </div>
          </div>
        ) : null}

        <div className="shrink-0">
          <JobStatusBadge status={job.status} />
        </div>
      </Card>
    </Link>
  );
}
