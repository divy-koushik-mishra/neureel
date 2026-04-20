import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  label?: string;
}

export function ChromaticRule({ className, label }: Props) {
  return (
    <div
      className={cn("relative w-full select-none", className)}
      aria-hidden={!label}
    >
      <div className="h-px w-full signal-gradient opacity-80" />
      {label ? (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-background px-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {label}
        </div>
      ) : null}
      <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60">
        <span>cold</span>
        <span>neutral</span>
        <span>hot</span>
      </div>
    </div>
  );
}
