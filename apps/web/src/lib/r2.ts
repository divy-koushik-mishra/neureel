import "server-only";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  // Surface a useful error at first-use, not at import time in case env is loaded later
  // (Next.js does `process.env` replacement at build, so this mostly guards dev).
  // eslint-disable-next-line no-console
  console.warn("[r2] Missing one or more R2 env vars — presigning will fail");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId ?? "",
    secretAccessKey: secretAccessKey ?? "",
  },
  // R2 doesn't implement AWS's newer checksum semantics. Without these two,
  // presigned PUTs include `x-amz-sdk-checksum-algorithm` in the signature,
  // which R2 rejects at the CORS preflight step.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = bucket ?? "";

export async function getPresignedUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 },
  );
}

export async function getSignedDownloadUrl(key: string) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 3600 },
  );
}
