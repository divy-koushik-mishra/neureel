import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  tone?: "default" | "brand" | "emerald" | "sky" | "amber" | "orange" | "rose";
}

const toneBg: Record<NonNullable<ProgressProps["tone"]>, string> = {
  default: "bg-foreground",
  brand: "bg-brand",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  orange: "bg-orange-400",
  rose: "bg-rose-400",
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, tone = "brand", ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      >
        <div
          className={cn("h-full transition-all duration-500", toneBg[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
