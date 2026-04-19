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
  const pct = Math.max(0, Math.min(100, score));
  return (
    <Card
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden p-6 sm:gap-6 sm:p-8",
        toneGlowClass[label.tone],
      )}
    >
      <div className="flex flex-col items-start gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Virality score
        </p>
        <div className="flex items-baseline gap-2">
          <div
            className={cn(
              "text-6xl font-semibold tabular-nums leading-none sm:text-7xl",
              toneTextClass[label.tone],
            )}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-lg text-muted-foreground sm:text-xl">/100</div>
        </div>
        <div
          className={cn(
            "mt-3 text-base font-medium",
            toneTextClass[label.tone],
          )}
        >
          {label.label}
        </div>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
          {label.description}
        </p>
      </div>

      <ScoreRail pct={pct} tone={label.tone} />
    </Card>
  );
}

function ScoreRail({ pct, tone }: { pct: number; tone: string }) {
  const fillClass: Record<string, string> = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    amber: "bg-amber-400",
    orange: "bg-orange-400",
    rose: "bg-rose-400",
  };
  return (
    <div className="mt-auto">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full", fillClass[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}
