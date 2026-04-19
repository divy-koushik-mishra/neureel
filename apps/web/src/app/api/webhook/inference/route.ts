import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookPayload {
  job_id?: string;
  status?: "completed" | "failed";
  virality_score?: number | null;
  brain_regions?: unknown;
  activation_map?: unknown;
  error?: string | null;
  note?: string | null;
  // POC-mode additions — stored in Job.rawOutput
  timeseries?: unknown;
  destrieux_full?: unknown;
  peak_moments?: unknown;
  raw_npy_url?: string | null;
  metadata?: unknown;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.MODAL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    job_id,
    status,
    virality_score,
    brain_regions,
    activation_map,
    error,
    note,
    timeseries,
    destrieux_full,
    peak_moments,
    raw_npy_url,
    metadata,
  } = payload;

  if (!job_id) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  }

  const existing = await prisma.job.findUnique({ where: { id: job_id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Collect all extra fields into a single JSON blob so the UI can iterate
  // on visualizations without us migrating the schema every time.
  const rawOutput =
    status === "completed"
      ? {
          timeseries: timeseries ?? null,
          destrieux_full: destrieux_full ?? null,
          peak_moments: peak_moments ?? null,
          raw_npy_url: raw_npy_url ?? null,
          metadata: metadata ?? null,
        }
      : null;

  await prisma.job.update({
    where: { id: job_id },
    data: {
      status: status === "completed" ? "COMPLETED" : "FAILED",
      viralityScore: virality_score ?? null,
      brainRegions: (brain_regions as object | null) ?? undefined,
      activationMap: (activation_map as object | null) ?? undefined,
      errorMessage: error ?? null,
      note: note ?? null,
      rawOutput: (rawOutput as object | null) ?? undefined,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
