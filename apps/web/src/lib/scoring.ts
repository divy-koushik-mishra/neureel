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

export function deriveRecommendations(regions: BrainRegion[]): string[] {
  const sorted = [...regions].sort((a, b) => b.activation - a.activation);
  const top = sorted.slice(0, 3);
  const tips: string[] = [];

  for (const region of top) {
    if (region.activation < 0.4) continue;
    switch (region.name) {
      case "nucleus_accumbens":
        tips.push(
          "Strong dopamine trigger — lead with this moment in the first 2 seconds.",
        );
        break;
      case "amygdala":
        tips.push(
          "High emotional arousal detected — keep the emotional peak in the opening frame.",
        );
        break;
      case "v1":
        tips.push(
          "Visual attention is locked in — maintain motion and contrast in edits.",
        );
        break;
      case "dlpfc":
        tips.push(
          "Viewers are reasoning about the content — pair with clear narrative payoff.",
        );
        break;
      case "insula":
        tips.push(
          "Social-emotional signal is firing — add a human face or reaction shot.",
        );
        break;
      case "brocas_area":
        tips.push(
          "Language processing is engaged — front-load the hook copy in captions.",
        );
        break;
      case "hippocampus":
        tips.push(
          "Memory encoding is active — this content will be recalled; reinforce branding.",
        );
        break;
      case "motor_cortex":
        tips.push(
          "Action simulation is high — viewers are imagining themselves doing this.",
        );
        break;
      case "tpj":
        tips.push(
          "Theory-of-mind signal — lean into character intent and inner-state reveals.",
        );
        break;
    }
  }

  if (tips.length === 0) {
    tips.push(
      "No region crosses the engagement threshold. Rework the opening hook and visual pacing.",
    );
  }

  return tips;
}
