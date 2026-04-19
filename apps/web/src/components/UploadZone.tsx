"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileImage, FileVideo, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const MAX_SIZE = 100 * 1024 * 1024;

const ACCEPT = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

type Stage = "idle" | "uploading" | "triggering" | "done" | "error";

export function UploadZone() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createJob = useMutation(trpc.jobs.create.mutationOptions());
  const triggerInference = useMutation(
    trpc.jobs.triggerInference.mutationOptions(),
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setProgress(0);
      const fileType: "video" | "image" = file.type.startsWith("video/")
        ? "video"
        : "image";

      const uploadToR2 = (f: File, url: string) =>
        new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", f.type);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 upload failed: ${xhr.status}`));
          };
          xhr.onerror = () =>
            reject(new Error("Network error uploading to R2"));
          xhr.send(f);
        });

      try {
        setStage("uploading");
        const { job, presignedUrl } = await createJob.mutateAsync({
          fileName: file.name,
          fileType,
          contentType: file.type,
        });

        await uploadToR2(file, presignedUrl);

        setStage("triggering");
        await triggerInference.mutateAsync({ jobId: job.id });

        setStage("done");
        await queryClient.invalidateQueries({
          queryKey: trpc.jobs.list.queryKey(),
        });

        setTimeout(() => {
          setStage("idle");
          setFileName(null);
          setProgress(0);
        }, 1600);
      } catch (err) {
        setStage("error");
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [createJob, triggerInference, queryClient, trpc.jobs.list],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        setError(rejections[0]?.errors[0]?.message ?? "File rejected");
        setStage("error");
        return;
      }
      const file = accepted[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    maxFiles: 1,
    disabled: stage === "uploading" || stage === "triggering",
  });

  const busy = stage === "uploading" || stage === "triggering";

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-center transition-all hover:border-brand/60 hover:bg-card sm:min-h-[220px] sm:p-8",
        isDragActive && "border-brand bg-brand/5",
        busy && "cursor-wait",
      )}
    >
      <input {...getInputProps()} />

      {stage === "idle" || stage === "error" ? (
        <>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand sm:size-12">
            <Upload className="size-5 sm:size-6" />
          </div>
          <p className="text-sm font-medium text-foreground sm:text-base">
            <span className="hidden sm:inline">
              Drop a video or image, or click to choose
            </span>
            <span className="sm:hidden">Tap to upload a video or image</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            MP4, MOV, AVI, JPG, PNG, WebP — up to 100 MB
          </p>
          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </div>
          ) : null}
        </>
      ) : null}

      {busy && fileName ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {fileName.match(/\.(mp4|mov|avi)$/i) ? (
              <FileVideo className="size-4" />
            ) : (
              <FileImage className="size-4" />
            )}
            <span className="truncate">{fileName}</span>
          </div>
          <Progress
            value={stage === "triggering" ? 100 : progress}
            tone="brand"
          />
          <p className="text-xs text-muted-foreground">
            {stage === "uploading"
              ? `Uploading ${progress}%`
              : "Dispatching inference…"}
          </p>
        </div>
      ) : null}

      {stage === "done" ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Upload className="size-6" />
          </div>
          <p className="text-base font-medium">Queued for analysis</p>
        </div>
      ) : null}

      {stage === "error" ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setStage("idle");
              setError(null);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
