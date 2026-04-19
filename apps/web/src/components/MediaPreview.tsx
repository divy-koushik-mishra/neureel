"use client";

import { Download, FileImage, FileVideo, ImageOff } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  fileUrl: string | null;
  fileName: string;
  inputType: string;
  className?: string;
}

export function MediaPreview({
  fileUrl,
  fileName,
  inputType,
  className,
}: Props) {
  const isVideo = inputType === "video";
  const [mediaError, setMediaError] = useState(false);

  return (
    <Card className={cn("flex flex-col overflow-hidden p-0", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[oklch(0.05_0_0)] sm:aspect-video">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.75_0.17_275/0.08),transparent_60%)]"
          aria-hidden
        />

        {fileUrl && !mediaError ? (
          isVideo ? (
            // biome-ignore lint/a11y/useMediaCaption: user-uploaded video, no caption track available
            <video
              src={fileUrl}
              controls
              playsInline
              preload="metadata"
              className="relative z-10 h-full w-full object-contain"
              onError={() => setMediaError(true)}
            />
          ) : (
            // biome-ignore lint/performance/noImgElement: signed R2 URL, next/image adds no value here
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={fileName}
              className="relative z-10 h-full w-full object-contain"
              onError={() => setMediaError(true)}
            />
          )
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-5" />
            <span className="text-xs">
              {mediaError ? "Failed to load media" : "Media unavailable"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {isVideo ? (
            <FileVideo className="size-3.5" />
          ) : (
            <FileImage className="size-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{fileName}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {isVideo ? "Uploaded video" : "Uploaded image"}
          </p>
        </div>
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/50 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label="Open original in a new tab"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Original</span>
          </a>
        ) : null}
      </div>
    </Card>
  );
}
