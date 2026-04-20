import { cn } from "@/lib/utils";

interface Props {
  coords?: [number, number, number];
  label?: string;
  className?: string;
  tone?: "muted" | "bio" | "hot" | "cold";
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  muted: "text-muted-foreground",
  bio: "text-[color:var(--signal-bio)]",
  hot: "text-[color:var(--signal-hot)]",
  cold: "text-[color:var(--signal-cold)]",
};

export function CoordTag({ coords, label, className, tone = "muted" }: Props) {
  const formatted = coords
    ? coords.map((n) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1))).join("  ")
    : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em]",
        TONE[tone],
        className,
      )}
    >
      <span className="inline-block h-px w-3 bg-current opacity-60" />
      {label ? <span>{label}</span> : null}
      {formatted ? <span className="opacity-80">[{formatted}]</span> : null}
    </span>
  );
}
