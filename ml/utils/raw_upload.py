"""Upload the raw TRIBE `preds` tensor (.npy) to Cloudflare R2 so the web
UI can offer a download link. Used only for POC iteration; no-ops when the
R2 creds aren't present.
"""
from __future__ import annotations

import io
import os
from typing import Optional

import numpy as np

_REQUIRED_ENV = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME")


def _have_creds() -> bool:
    return all(os.environ.get(k) for k in _REQUIRED_ENV)


def _client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        # R2 rejects the newer AWS integrity headers; same workaround as
        # apps/web/src/lib/r2.ts — disable the pre-upload checksum.
        config=Config(
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )


def upload_npy(arr: np.ndarray, *, job_id: str) -> Optional[str]:
    if not _have_creds():
        print("[raw_upload] R2 creds missing — skipping raw .npy upload")
        return None

    try:
        client = _client()
        buf = io.BytesIO()
        np.save(buf, arr, allow_pickle=False)
        buf.seek(0)
        key = f"raw/{job_id}.npy"
        client.put_object(
            Bucket=os.environ["R2_BUCKET_NAME"],
            Key=key,
            Body=buf.getvalue(),
            ContentType="application/octet-stream",
        )
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": os.environ["R2_BUCKET_NAME"], "Key": key},
            ExpiresIn=60 * 60 * 24 * 7,  # 7 days
        )
        return url
    except Exception as exc:
        print(f"[raw_upload] upload failed for job {job_id}: {exc}")
        return None
