import "server-only";

export interface TriggerInferenceParams {
  jobId: string;
  fileUrl: string;
  fileType: "video" | "image";
}

export async function triggerInference(params: TriggerInferenceParams) {
  const modalUrl = process.env.MODAL_API_URL;
  const secret = process.env.MODAL_WEBHOOK_SECRET;
  // WEBHOOK_BASE_URL is the publicly reachable URL Modal should POST back to.
  // In dev this is a tunnel (ngrok/cloudflared) even when the user's browser
  // is on localhost — keeping these decoupled avoids serving the whole app
  // through the tunnel.
  const callbackBase =
    process.env.WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!modalUrl || !secret || !callbackBase) {
    throw new Error(
      "Missing MODAL_API_URL, MODAL_WEBHOOK_SECRET, or WEBHOOK_BASE_URL/NEXT_PUBLIC_APP_URL",
    );
  }

  // Strip trailing slash so a stray WEBHOOK_BASE_URL="https://.../" doesn't
  // produce "https://.../ /api/webhook/inference" with a double slash.
  const normalizedBase = callbackBase.replace(/\/+$/, "");

  const res = await fetch(`${modalUrl.replace(/\/+$/, "")}/inference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": secret,
    },
    body: JSON.stringify({
      job_id: params.jobId,
      file_url: params.fileUrl,
      file_type: params.fileType,
      webhook_url: `${normalizedBase}/api/webhook/inference`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Modal API error: ${res.status} ${body}`);
  }

  return res.json();
}
