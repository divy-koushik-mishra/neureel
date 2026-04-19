import { type NextRequest, NextResponse } from "next/server";

// Belt-and-suspenders redirect for unauthenticated users. The dashboard
// layout does the authoritative check via auth.api.getSession; this just
// skips the server round-trip when there's clearly no session cookie.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const hasSession =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
