import { Card } from "@/components/ui/card";
import { getViralityLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const toneTextClass: Record<string, string> = {
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
  orange: "text-orange-400",
  rose: "text-rose-400",
};

const toneGlowClass: Record<string, string> = {
  emerald: "shadow-[0_0_80px_-20px_oklch(0.78_0.17_155/0.7)]",
  sky: "shadow-[0_0_80px_-20px_oklch(0.7_0.15_230/0.6)]",
  amber: "shadow-[0_0_80px_-20px_oklch(0.78_0.18_85/0.5)]",
  orange: "shadow-[0_0_80px_-20px_oklch(0.73_0.18_50/0.5)]",
  rose: "shadow-[0_0_80px_-20px_oklch(0.65_0.2_15/0.5)]",
};

export function ViralityScoreCard({ score }: { score: number }) {
  const label = getViralityLabel(score);
  return (
    <Card className={cn("relative p-8", toneGlowClass[label.tone])}>
      <div className="flex flex-col items-start gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Virality Score
        </p>
        <div className="flex items-baseline gap-2">
          <div
            className={cn(
              "text-7xl font-semibold tabular-nums leading-none",
              toneTextClass[label.tone],
            )}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-xl text-muted-foreground">/100</div>
        </div>
        <div
          className={cn(
            "mt-3 text-base font-medium",
            toneTextClass[label.tone],
          )}
        >
          {label.label}
        </div>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {label.description}
        </p>
      </div>
    </Card>
  );
}
