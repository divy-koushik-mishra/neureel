"use client";

import { ChevronDown, Clock, Copy, Download, FlaskConical } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Types ------------------------------------------------------------

interface Timeseries {
  whole_brain_mean: number[];
  tracked_region_series: Record<string, number[]>;
}

interface PeakRegion {
  name: string;
  activation: number;
}

interface PeakMoment {
  timestep: number;
  time_seconds: number;
  activation: number;
  top_regions: PeakRegion[];
}

interface DestrieuxRow {
  name: string;
  hemisphere: string;
  activation: number;
  n_vertices: number;
}

interface Metadata {
  model?: string;
  n_vertices?: number;
  n_timesteps?: number;
  timestep_seconds?: number;
  video_duration_seconds?: number;
  inference_duration_seconds?: number;
  n_tracked_vertices?: number;
  n_destrieux_rows?: number;
}

export interface RawOutput {
  timeseries?: Timeseries | null;
  destrieux_full?: DestrieuxRow[] | null;
  peak_moments?: PeakMoment[] | null;
  raw_npy_url?: string | null;
  metadata?: Metadata | null;
}

// --- Normalization ----------------------------------------------------

export function normalizeRawOutput(value: unknown): RawOutput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<RawOutput>;
  return {
    timeseries: normalizeTimeseries(v.timeseries),
    destrieux_full: normalizeDestrieux(v.destrieux_full),
    peak_moments: normalizePeaks(v.peak_moments),
    raw_npy_url: typeof v.raw_npy_url === "string" ? v.raw_npy_url : null,
    metadata:
      v.metadata && typeof v.metadata === "object"
        ? (v.metadata as Metadata)
        : null,
  };
}

function normalizeTimeseries(v: unknown): Timeseries | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Partial<Timeseries>;
  const wbm = Array.isArray(t.whole_brain_mean)
    ? t.whole_brain_mean.filter((x): x is number => typeof x === "number")
    : [];
  const series =
    t.tracked_region_series && typeof t.tracked_region_series === "object"
      ? Object.fromEntries(
          Object.entries(t.tracked_region_series as Record<string, unknown>)
            .map(([k, arr]) => [
              k,
              Array.isArray(arr)
                ? arr.filter((x): x is number => typeof x === "number")
                : [],
            ])
            .filter(([, arr]) => (arr as number[]).length > 0),
        )
      : {};
  return { whole_brain_mean: wbm, tracked_region_series: series };
}

function normalizeDestrieux(v: unknown): DestrieuxRow[] | null {
  if (!Array.isArray(v)) return null;
  return v.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const r = row as Partial<DestrieuxRow>;
    if (typeof r.name !== "string" || typeof r.activation !== "number")
      return [];
    return [
      {
        name: r.name,
        hemisphere: typeof r.hemisphere === "string" ? r.hemisphere : "",
        activation: r.activation,
        n_vertices: typeof r.n_vertices === "number" ? r.n_vertices : 0,
      },
    ];
  });
}

function normalizePeaks(v: unknown): PeakMoment[] | null {
  if (!Array.isArray(v)) return null;
  return v.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const r = row as Partial<PeakMoment>;
    if (
      typeof r.timestep !== "number" ||
      typeof r.activation !== "number" ||
      typeof r.time_seconds !== "number"
    ) {
      return [];
    }
    const top = Array.isArray(r.top_regions)
      ? r.top_regions.flatMap((p) => {
          if (
            p &&
            typeof p === "object" &&
            typeof (p as PeakRegion).name === "string" &&
            typeof (p as PeakRegion).activation === "number"
          ) {
            return [p as PeakRegion];
          }
          return [];
        })
      : [];
    return [
      {
        timestep: r.timestep,
        time_seconds: r.time_seconds,
        activation: r.activation,
        top_regions: top,
      },
    ];
  });
}

// --- Components -------------------------------------------------------

const TRACKED_COLORS: Record<string, string> = {
  v1: "oklch(0.72 0.18 230)",
  dlpfc: "oklch(0.75 0.15 280)",
  brocas_area: "oklch(0.73 0.17 150)",
  insula: "oklch(0.75 0.16 60)",
  amygdala: "oklch(0.68 0.22 20)",
  nucleus_accumbens: "oklch(0.72 0.2 330)",
};

function prettyRegion(name: string): string {
  return name
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function fmtSeconds(s: number): string {
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function Playground({ raw }: { raw: RawOutput | null }) {
  if (!raw) return null;
  const { timeseries, destrieux_full, peak_moments, raw_npy_url, metadata } =
    raw;

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 p-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-brand" />
          <CardTitle>Playground</CardTitle>
        </div>
        {metadata ? (
          <div className="hidden flex-wrap items-center gap-3 text-xs text-muted-foreground md:flex">
            {metadata.n_vertices != null ? (
              <span>{metadata.n_vertices.toLocaleString()} vertices</span>
            ) : null}
            {metadata.n_timesteps != null ? (
              <span>{metadata.n_timesteps} timesteps</span>
            ) : null}
            {metadata.video_duration_seconds != null ? (
              <span>{metadata.video_duration_seconds.toFixed(1)}s</span>
            ) : null}
            {metadata.inference_duration_seconds != null ? (
              <span>
                inference {metadata.inference_duration_seconds.toFixed(1)}s
              </span>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-8 p-5">
        {timeseries && timeseries.whole_brain_mean.length > 0 ? (
          <WholeBrainTimeline
            series={timeseries.whole_brain_mean}
            timestepSeconds={metadata?.timestep_seconds ?? 1}
          />
        ) : null}

        {timeseries &&
        Object.keys(timeseries.tracked_region_series).length > 0 ? (
          <RegionHeatmap
            series={timeseries.tracked_region_series}
            timestepSeconds={metadata?.timestep_seconds ?? 1}
          />
        ) : null}

        {peak_moments && peak_moments.length > 0 ? (
          <PeakMoments moments={peak_moments} />
        ) : null}

        {destrieux_full && destrieux_full.length > 0 ? (
          <DestrieuxDrilldown rows={destrieux_full} />
        ) : null}

        <RawDataSection raw={raw} npyUrl={raw_npy_url ?? null} />
      </CardContent>
    </Card>
  );
}

// --- Whole-brain line chart ------------------------------------------

function WholeBrainTimeline({
  series,
  timestepSeconds,
}: {
  series: number[];
  timestepSeconds: number;
}) {
  const { pathD, w, h, min, max, peakIdx } = useMemo(() => {
    const W = 800;
    const H = 140;
    const padX = 28;
    const padY = 12;
    const n = series.length;
    if (n < 2) {
      return { pathD: "", w: W, h: H, min: 0, max: 1, peakIdx: 0 };
    }
    const lo = Math.min(...series);
    const hi = Math.max(...series);
    const span = hi - lo || 1;
    const step = (W - padX * 2) / (n - 1);
    const points = series.map((v, i) => {
      const x = padX + i * step;
      const y = padY + (H - padY * 2) * (1 - (v - lo) / span);
      return [x, y] as const;
    });
    const d =
      `M ${points[0][0]} ${points[0][1]} ` +
      points
        .slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(" ");
    let peak = 0;
    for (let i = 1; i < series.length; i++)
      if (series[i] > series[peak]) peak = i;
    return { pathD: d, w: W, h: H, min: lo, max: hi, peakIdx: peak };
  }, [series]);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">
          Whole-brain activation over time
        </h3>
        <span className="text-xs text-muted-foreground">
          peak at {fmtSeconds(peakIdx * timestepSeconds)}
        </span>
      </header>
      <div className="overflow-hidden rounded-md border border-border/60 bg-card/40">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Whole-brain activation line chart"
          className="block h-[160px] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wbmFill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.75 0.17 275)"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.75 0.17 275)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {pathD ? (
            <>
              <path
                d={`${pathD} L ${w - 28} ${h - 12} L 28 ${h - 12} Z`}
                fill="url(#wbmFill)"
                stroke="none"
              />
              <path
                d={pathD}
                fill="none"
                stroke="oklch(0.8 0.17 275)"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </>
          ) : null}
        </svg>
      </div>
      <footer className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>0:00</span>
        <span>
          min {min.toFixed(3)} · max {max.toFixed(3)}
        </span>
        <span>{fmtSeconds((series.length - 1) * timestepSeconds)}</span>
      </footer>
    </section>
  );
}

// --- Region × time heatmap -------------------------------------------

function RegionHeatmap({
  series,
  timestepSeconds,
}: {
  series: Record<string, number[]>;
  timestepSeconds: number;
}) {
  const entries = useMemo(() => Object.entries(series), [series]);
  const nT = entries[0]?.[1]?.length ?? 0;

  // Per-row normalization so each region's dynamics are visible even when
  // absolute magnitudes differ. Switch to global if you want cross-region
  // comparison instead.
  const normalized = useMemo(() => {
    return entries.map(([name, arr]) => {
      const lo = Math.min(...arr);
      const hi = Math.max(...arr);
      const span = hi - lo || 1;
      return [name, arr.map((v) => (v - lo) / span)] as const;
    });
  }, [entries]);

  if (nT === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">Region activation heatmap</h3>
        <span className="text-xs text-muted-foreground">
          row-normalized · {nT} timesteps
        </span>
      </header>
      <div
        className="grid gap-px overflow-hidden rounded-md border border-border/60 bg-border/40 text-xs"
        style={{
          gridTemplateColumns: "140px 1fr",
        }}
      >
        {normalized.map(([name, vals]) => (
          <Fragment key={name}>
            <div className="flex items-center gap-2 bg-card/60 px-3 py-2 text-[11px]">
              <span
                className="size-2 rounded-full"
                style={{ background: TRACKED_COLORS[name] ?? "#888" }}
              />
              <span className="truncate">{prettyRegion(name)}</span>
            </div>
            <div
              className="grid bg-card/60"
              style={{ gridTemplateColumns: `repeat(${nT}, minmax(4px, 1fr))` }}
            >
              {vals.map((v, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: timestep index is the natural key for a heatmap row
                  key={`${name}-${i}`}
                  title={`${prettyRegion(name)} @ ${fmtSeconds(i * timestepSeconds)} — ${v.toFixed(3)}`}
                  style={{
                    backgroundColor: TRACKED_COLORS[name] ?? "#888",
                    opacity: 0.08 + v * 0.9,
                  }}
                  className="h-6"
                />
              ))}
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

// --- Peak moments ----------------------------------------------------

function PeakMoments({ moments }: { moments: PeakMoment[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Peak moments</h3>
      <div className="flex flex-col divide-y divide-border/60 rounded-md border border-border/60">
        {moments.map((m) => (
          <div
            key={m.timestep}
            className="flex items-center gap-4 px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="tabular-nums">{fmtSeconds(m.time_seconds)}</span>
            </div>
            <div className="w-24 text-xs tabular-nums text-muted-foreground">
              {m.activation.toFixed(4)}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.top_regions.map((r) => (
                <span
                  key={r.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-0.5 text-xs"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      background: TRACKED_COLORS[r.name] ?? "#888",
                    }}
                  />
                  {prettyRegion(r.name)}
                  <span className="text-muted-foreground tabular-nums">
                    {r.activation.toFixed(2)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Destrieux drilldown --------------------------------------------

function DestrieuxDrilldown({ rows }: { rows: DestrieuxRow[] }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<"activation" | "name">("activation");
  const sorted = useMemo(() => {
    const cp = [...rows];
    if (sort === "activation") cp.sort((a, b) => b.activation - a.activation);
    else cp.sort((a, b) => a.name.localeCompare(b.name));
    return cp;
  }, [rows, sort]);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-border/60 bg-card/40 px-4 py-2 text-sm hover:bg-card/70"
      >
        <span className="flex items-center gap-2 font-medium">
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          Full Destrieux breakdown
          <span className="text-xs font-normal text-muted-foreground">
            {rows.length} regions
          </span>
        </span>
        {open ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            sort:
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSort((s) => (s === "activation" ? "name" : "activation"));
              }}
              className="rounded border border-border/60 px-2 py-0.5 hover:bg-card/70"
            >
              {sort === "activation" ? "activation" : "name"}
            </button>
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="max-h-[420px] overflow-auto rounded-md border border-border/60">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/80 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Hemi</th>
                <th className="px-3 py-2 font-medium text-right">Activation</th>
                <th className="px-3 py-2 font-medium text-right">Vertices</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={`${r.name}-${r.hemisphere}-${i}`}
                  className="border-t border-border/40"
                >
                  <td className="px-3 py-1.5 font-mono text-xs">{r.name}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {r.hemisphere}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-1.5 rounded-full bg-brand/70"
                        style={{
                          width: `${Math.max(4, r.activation * 60)}px`,
                        }}
                      />
                      {r.activation.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs text-muted-foreground tabular-nums">
                    {r.n_vertices}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

// --- Raw data --------------------------------------------------------

function RawDataSection({
  raw,
  npyUrl,
}: {
  raw: RawOutput;
  npyUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pretty = useMemo(() => JSON.stringify(raw, null, 2), [raw]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          Raw data
          <span className="text-xs font-normal text-muted-foreground">
            (JSON)
          </span>
        </button>
        <div className="flex items-center gap-2">
          {npyUrl ? (
            <a
              href={npyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/50 px-3 py-1.5 text-xs hover:bg-card/80"
            >
              <Download className="size-3.5" />
              Download raw .npy
            </a>
          ) : null}
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="size-3.5" />
            {copied ? "Copied!" : "Copy JSON"}
          </Button>
        </div>
      </div>
      {open ? (
        <pre className="max-h-[420px] overflow-auto rounded-md border border-border/60 bg-card/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {pretty}
        </pre>
      ) : null}
    </section>
  );
}
