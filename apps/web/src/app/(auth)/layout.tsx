import { Brain } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
      </div>

      <Link
        href="/"
        className="relative z-10 mb-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
          <Brain className="size-3.5" />
        </div>
        Neureel
      </Link>

      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
