import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kicks off Google sign-in via a plain GET. Navigating here works even if
// client-side JS fails to hydrate (e.g. when an ngrok banner is injected
// into the HTML and React aborts hydration on a mismatch).
export async function GET(request: Request) {
  try {
    const result = (await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/dashboard",
      },
      headers: request.headers,
      asResponse: false,
    })) as { url?: string; redirect?: boolean };

    if (result?.url) {
      return NextResponse.redirect(result.url);
    }

    return NextResponse.json(
      { error: "No redirect URL returned from auth" },
      { status: 500 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auth failed" },
      { status: 500 },
    );
  }
}
