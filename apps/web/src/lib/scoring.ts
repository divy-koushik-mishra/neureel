export interface BrainRegion {
  name: string;
  activation: number;
  function: string;
}

// Weights sum to 1.0 — tunable over time as we learn from real engagement data.
export const VIRALITY_WEIGHTS: Record<string, number> = {
  nucleus_accumbens: 0.25,
  amygdala: 0.2,
  v1: 0.2,
  dlpfc: 0.15,
  insula: 0.1,
  brocas_area: 0.1,
};

export const REGION_FUNCTIONS: Record<string, string> = {
  nucleus_accumbens: "Reward & Dopamine Response",
  amygdala: "Emotional Arousal",
  v1: "Visual Attention",
  dlpfc: "Decision Making",
  insula: "Social Emotion & Empathy",
  brocas_area: "Language & Narrative Processing",
  hippocampus: "Memory Encoding",
  motor_cortex: "Action Simulation",
  tpj: "Theory of Mind & Social Cognition",
};

export function computeViralityScore(regions: BrainRegion[]): number {
  let score = 0;
  for (const region of regions) {
    const weight = VIRALITY_WEIGHTS[region.name] ?? 0;
    score += region.activation * weight;
  }
  return Math.round(score * 100 * 10) / 10;
}

export type ViralityBucket =
  | "high"
  | "strong"
  | "moderate"
  | "low"
  | "unlikely";

export interface ViralityLabel {
  label: string;
  bucket: ViralityBucket;
  // Tailwind-friendly color tokens — consumed by components, not hardcoded in logic
  tone: "emerald" | "sky" | "amber" | "orange" | "rose";
  description: string;
}

export function getViralityLabel(score: number): ViralityLabel {
  if (score >= 80) {
    return {
      label: "High Viral Potential",
      bucket: "high",
      tone: "emerald",
      description: "Strong activation across reward and attention networks.",
    };
  }
  if (score >= 60) {
    return {
      label: "Strong Engagement",
      bucket: "strong",
      tone: "sky",
      description: "Above-average pull on attention and emotional systems.",
    };
  }
  if (score >= 40) {
    return {
      label: "Moderate — Needs Hook",
      bucket: "moderate",
      tone: "amber",
      description:
        "Decent signal, but the opening doesn't fire reward regions.",
    };
  }
  if (score >= 20) {
    return {
      label: "Low Engagement",
      bucket: "low",
      tone: "orange",
      description: "Minimal arousal or reward response — likely scroll-past.",
    };
  }
  return {
    label: "Unlikely to Retain Attention",
    bucket: "unlikely",
    tone: "rose",
    description: "Little neural engagement detected. Rework hook and pacing.",
  };
}

// -----------------------------------------------------------------------------
// Recommendations
//
// Rule-based tip engine that leans on the per-timestep data TRIBE produces
// (peak moments, per-region time series) instead of just the mean-over-time
// region summary. Each rule is a pure function; they're run in priority order
// and we stop after 3 tips. If nothing fires, a single fallback tip is emitted.
// No LLM, no network calls — all deterministic TypeScript.
// -----------------------------------------------------------------------------

export interface PeakMomentForRec {
  timestep: number;
  time_seconds: number;
  activation: number;
  top_regions: Array<{ name: string; activation: number }>;
}

export interface RecommendationInputs {
  /** Mean-over-time per tracked region (length 6 for the tracked set). */
  regions: BrainRegion[];
  /** `{regionName: activation per timestep}`. Empty map for legacy jobs. */
  trackedSeries: Record<string, number[]>;
  /** Top-N whole-brain peaks. Empty for legacy jobs. */
  peakMoments: PeakMomentForRec[];
  /** Usually 1.0 — TRIBE predicts per second. */
  timestepSeconds: number;
}

type Rule = (input: RecommendationInputs) => string | null;

const MAX_TIPS = 3;

export function deriveRecommendations(input: RecommendationInputs): string[] {
  const rules: Rule[] = [
    peakAnchorRule,
    hookStrengthRule,
    dlpfcPayoffRule,
    middleSagRule,
    dominantRegionRule,
    flatlineRule,
  ];

  const tips: string[] = [];
  for (const rule of rules) {
    if (tips.length >= MAX_TIPS) break;
    const tip = rule(input);
    if (tip) tips.push(tip);
  }

  if (tips.length === 0) {
    tips.push(
      "No region crosses the engagement threshold. Rework the opening hook and visual pacing.",
    );
  }
  return tips;
}

// --- Rules -----------------------------------------------------------------

const peakAnchorRule: Rule = ({
  peakMoments,
  timestepSeconds,
  trackedSeries,
}) => {
  if (peakMoments.length === 0) return null;
  const nT = anyTimestepLength(trackedSeries);
  if (nT <= 3) return null;
  const total = nT * timestepSeconds;
  const peak = peakMoments[0];
  const frac = total > 0 ? peak.time_seconds / total : 0.5;
  const at = fmtClock(peak.time_seconds);
  if (frac < 0.2) {
    return `Biggest neural spike lands at ${at} — strong cold open; keep the opening cut tight.`;
  }
  if (frac > 0.8) {
    return `Biggest spike lands at ${at} — payoff is in place; trim the middle if it drags.`;
  }
  const dominant = peak.top_regions[0]?.name;
  if (dominant) {
    return `Peak at ${at} drives the score — dominant region: ${prettyRegion(dominant)}.`;
  }
  return `Peak at ${at} drives the score.`;
};

const hookStrengthRule: Rule = ({ trackedSeries, timestepSeconds }) => {
  const entries = Object.entries(trackedSeries);
  if (entries.length === 0) return null;
  const firstN = Math.max(1, Math.round(2 / Math.max(0.01, timestepSeconds)));
  let max = -Infinity;
  let maxName: string | null = null;
  for (const [name, series] of entries) {
    const window = series.slice(0, firstN);
    if (window.length === 0) continue;
    const localMax = Math.max(...window);
    if (localMax > max) {
      max = localMax;
      maxName = name;
    }
  }
  if (maxName === null) return null;
  if (max >= 0.65) {
    return `Strong opening — ${prettyRegion(maxName)} fires in the first 2 seconds.`;
  }
  if (max <= 0.25) {
    return "Weak opening — the first 2 seconds don't land. Consider a visual or emotional punch up front.";
  }
  return null;
};

const dlpfcPayoffRule: Rule = ({ trackedSeries }) => {
  const series = trackedSeries.dlpfc;
  if (!series || series.length < 3) return null;
  const parts = thirds(series);
  if (parts === null) return null;
  const delta = parts.last - parts.first;
  if (delta > 0.15) {
    return "Reasoning builds through the clip — payoff feels earned.";
  }
  if (delta < -0.15) {
    return "Reasoning drops toward the end — payoff may feel abrupt.";
  }
  return null;
};

const middleSagRule: Rule = ({ trackedSeries, timestepSeconds }) => {
  const entries = Object.values(trackedSeries);
  if (entries.length === 0) return null;
  const nT = entries[0]?.length ?? 0;
  if (nT < 6) return null;
  // Approximate whole-brain by averaging the tracked series we have.
  const wholeBrain = new Array<number>(nT).fill(0);
  for (let i = 0; i < nT; i++) {
    let sum = 0;
    let count = 0;
    for (const series of entries) {
      if (i < series.length) {
        sum += series[i];
        count += 1;
      }
    }
    wholeBrain[i] = count > 0 ? sum / count : 0;
  }
  const parts = thirds(wholeBrain);
  if (parts === null) return null;
  const edges = (parts.first + parts.last) / 2;
  if (parts.middle >= edges - 0.12) return null;
  // Find the lowest point in the middle third to anchor the tip.
  const start = Math.floor(nT / 3);
  const end = Math.floor((2 * nT) / 3);
  let minIdx = start;
  let minVal = Infinity;
  for (let i = start; i < end; i++) {
    if (wholeBrain[i] < minVal) {
      minVal = wholeBrain[i];
      minIdx = i;
    }
  }
  const at = fmtClock(minIdx * timestepSeconds);
  return `Middle section sags — compress the midsection or insert a pattern-break around ${at} (lowest point).`;
};

const DOMINANT_COPY: Record<string, string> = {
  v1: "Visual attention dominates — maintain motion and contrast through the whole clip.",
  dlpfc:
    "Decision and curiosity are engaged — make the payoff legible, not clever.",
  insula:
    "Social-emotional thread is the primary driver — keep human faces and reactions visible.",
  brocas_area: "Language carries the clip — front-load hook copy in captions.",
  amygdala:
    "High emotional arousal — don't mute the emotional beat in the edit.",
  nucleus_accumbens:
    "Reward signal dominates — frame this aspirationally, not informationally.",
};

const dominantRegionRule: Rule = ({
  regions,
  trackedSeries,
  timestepSeconds,
}) => {
  if (regions.length === 0) return null;
  const top = [...regions].sort((a, b) => b.activation - a.activation)[0];
  if (!top || top.activation < 0.4) return null;
  const base = DOMINANT_COPY[top.name];
  if (!base) return null;
  const series = trackedSeries[top.name];
  const peakIdx = series ? argmax(series) : null;
  if (peakIdx !== null) {
    const at = fmtClock(peakIdx * timestepSeconds);
    return `${base.replace(/\.$/, "")} (peaks at ${at}).`;
  }
  return base;
};

const flatlineRule: Rule = ({ regions }) => {
  if (regions.length === 0) return null;
  const max = Math.max(...regions.map((r) => r.activation));
  if (max >= 0.2) return null;
  return "Low engagement across the board — rework the hook, pacing, and payoff.";
};

// --- Helpers ---------------------------------------------------------------

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function thirds(
  xs: number[],
): { first: number; middle: number; last: number } | null {
  const n = xs.length;
  if (n < 3) return null;
  const a = Math.floor(n / 3);
  const b = Math.floor((2 * n) / 3);
  return {
    first: mean(xs.slice(0, a)),
    middle: mean(xs.slice(a, b)),
    last: mean(xs.slice(b)),
  };
}

function argmax(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let best = 0;
  let bestVal = xs[0];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] > bestVal) {
      bestVal = xs[i];
      best = i;
    }
  }
  return best;
}

function anyTimestepLength(series: Record<string, number[]>): number {
  for (const arr of Object.values(series)) {
    if (arr.length > 0) return arr.length;
  }
  return 0;
}

function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function prettyRegion(name: string): string {
  return name
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
