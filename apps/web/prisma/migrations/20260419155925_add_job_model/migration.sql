-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "inputType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "r2Url" TEXT,
    "activationMap" JSONB,
    "brainRegions" JSONB,
    "viralityScore" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_userId_idx" ON "job"("userId");

-- CreateIndex
CREATE INDEX "job_status_idx" ON "job"("status");

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
