import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { triggerInference } from "@/lib/modal";
import prisma from "@/lib/prisma";
import { getPresignedUploadUrl, getSignedDownloadUrl } from "@/lib/r2";
import { createTRPCRouter, protectedProcedure } from "../init";

const fileTypeSchema = z.enum(["video", "image"]);

export const jobsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: fileTypeSchema,
        contentType: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^\w.-]+/g, "_");
      const r2Key = `uploads/${ctx.user.id}/${Date.now()}-${safeName}`;
      const presignedUrl = await getPresignedUploadUrl(
        r2Key,
        input.contentType,
      );

      const job = await prisma.job.create({
        data: {
          userId: ctx.user.id,
          status: "PENDING",
          inputType: input.fileType,
          fileName: input.fileName,
          r2Key,
        },
      });

      return { job, presignedUrl, r2Key };
    }),

  triggerInference: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await prisma.job.findFirst({
        where: { id: input.jobId, userId: ctx.user.id },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (job.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job already triggered",
        });
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PROCESSING" },
      });

      const fileUrl = await getSignedDownloadUrl(job.r2Key);

      try {
        await triggerInference({
          jobId: job.id,
          fileUrl,
          fileType: job.inputType as "video" | "image",
        });
      } catch (err) {
        // Roll the job back to FAILED so the UI surfaces the error
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage:
              err instanceof Error ? err.message : "Unknown Modal error",
            completedAt: new Date(),
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to dispatch inference",
          cause: err,
        });
      }

      return { status: "processing" as const };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await prisma.job.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return job;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return prisma.job.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});
