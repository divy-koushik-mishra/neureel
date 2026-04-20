import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Top-left label, rendered in small uppercase mono. */
  label?: string;
  /** Top-right readout (status, coord, etc.). */
  readout?: ReactNode;
  /** Optional bottom-right caption (Destrieux code, plate number). */
  caption?: ReactNode;
  /** Render the corner tick marks. Default true. */
  ticks?: boolean;
}

/**
 * Sharp-cornered laboratory instrument frame. Used for the hero specimen,
 * method panels, and region plates. Opinionated aesthetic: tick marks at
 * each corner, 1px hairline border, mono labels in the gutter.
 */
export function InstrumentFrame({
  children,
  className,
  label,
  readout,
  caption,
  ticks = true,
}: Props) {
  return (
    <div className={cn("relative", className)}>
      {(label || readout) && (
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {label ? <span>{label}</span> : <span />}
          {readout ? <span>{readout}</span> : null}
        </div>
      )}
      <div className="relative border border-[color:var(--rule)] bg-[color:var(--paper)]">
        {ticks ? (
          <>
            <Tick className="-top-px -left-px" corner="tl" />
            <Tick className="-top-px -right-px" corner="tr" />
            <Tick className="-bottom-px -left-px" corner="bl" />
            <Tick className="-bottom-px -right-px" corner="br" />
          </>
        ) : null}
        {children}
      </div>
      {caption ? (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80">
          {caption}
        </div>
      ) : null}
    </div>
  );
}

function Tick({
  corner,
  className,
}: {
  corner: "tl" | "tr" | "bl" | "br";
  className?: string;
}) {
  const base =
    "pointer-events-none absolute size-2 border-[color:var(--foreground)]/60";
  const edges = {
    tl: "border-t border-l",
    tr: "border-t border-r",
    bl: "border-b border-l",
    br: "border-b border-r",
  }[corner];
  return <span aria-hidden className={cn(base, edges, className)} />;
}
