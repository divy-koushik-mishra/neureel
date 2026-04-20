-- Add share visibility + unguessable public slug
ALTER TABLE "job" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "job" ADD COLUMN "publicSlug" TEXT;
CREATE UNIQUE INDEX "job_publicSlug_key" ON "job"("publicSlug");
