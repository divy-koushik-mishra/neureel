import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type BrainRegion,
  deriveRecommendations,
  type PeakMomentForRec,
} from "@/lib/scoring";

interface Props {
  regions: BrainRegion[];
  /** Per-region per-timestep series from rawOutput. Optional for legacy jobs. */
  trackedSeries?: Record<string, number[]>;
  /** Top-N whole-brain peaks from rawOutput. Optional for legacy jobs. */
  peakMoments?: PeakMomentForRec[];
  /** Seconds per TRIBE timestep (usually 1). Optional, defaults to 1. */
  timestepSeconds?: number;
}

export function Recommendations({
  regions,
  trackedSeries,
  peakMoments,
  timestepSeconds,
}: Props) {
  const tips = deriveRecommendations({
    regions,
    trackedSeries: trackedSeries ?? {},
    peakMoments: peakMoments ?? [],
    timestepSeconds: timestepSeconds ?? 1,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <CardTitle>Recommendations</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="mt-[6px] block size-1.5 shrink-0 rounded-full bg-brand" />
              <span className="text-foreground/90 leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
