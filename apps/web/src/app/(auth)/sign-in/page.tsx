import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Server component — no client JS needed. The button is a plain anchor that
// hits a server route which redirects to Google OAuth. Works even under
// hostile network conditions (ngrok banners, blocked JS, etc.).
export default function SignInPage() {
  return (
    <Card className="p-8">
      <CardHeader className="p-0 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Neureel
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to analyze your content
        </p>
      </CardHeader>
      <CardContent className="p-0 pt-6">
        <a
          href="/api/auth-start/google"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "w-full",
          )}
        >
          <GoogleIcon />
          Continue with Google
        </a>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our terms of service.
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Google" className="size-4">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
