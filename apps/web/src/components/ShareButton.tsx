"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, Lock, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface Props {
  jobId: string;
  isPublic: boolean;
  publicSlug: string | null;
  disabled?: boolean;
}

export function ShareButton({ jobId, isPublic, publicSlug, disabled }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const setVisibility = useMutation(
    trpc.jobs.setVisibility.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: trpc.jobs.getById.queryKey({ id: jobId }),
        });
      },
    }),
  );

  const shareUrl = useMemo(() => {
    if (!isPublic || !publicSlug) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/${publicSlug}`;
  }, [isPublic, publicSlug]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // swallow — clipboard denied
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {isPublic ? (
          <Globe className="size-4" />
        ) : (
          <Share2 className="size-4" />
        )}
        <span>{isPublic ? "Public" : "Share"}</span>
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close share menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Share analysis"
            className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-popover p-4 shadow-xl"
          >
            <div className="mb-3">
              <p className="text-sm font-medium">Share this analysis</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Anyone with the link can view the uploaded media, virality
                score, brain activation, and the Playground. Turn sharing off to
                invalidate the link.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card/40 p-3">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  isPublic
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isPublic ? (
                  <Globe className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">
                  {isPublic ? "Public link" : "Private"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {isPublic
                    ? "Accessible without sign-in"
                    : "Only you can see this"}
                </p>
              </div>
              <VisibilityToggle
                checked={isPublic}
                disabled={setVisibility.isPending || disabled}
                onChange={(next) =>
                  setVisibility.mutate({ id: jobId, isPublic: next })
                }
              />
            </div>

            {isPublic && shareUrl ? (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium hover:bg-muted/70"
                >
                  {copied ? (
                    <>
                      <Check className="size-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {setVisibility.isError ? (
              <p className="mt-2 text-xs text-rose-400">
                {setVisibility.error?.message ?? "Couldn't update sharing"}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function VisibilityToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Make private" : "Make public"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-emerald-400/60 bg-emerald-500"
          : "border-border bg-muted-foreground/25 hover:bg-muted-foreground/35",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-150",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
