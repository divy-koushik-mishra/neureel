import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const NAV = [
  { label: "Method", href: "#method" },
  { label: "Science", href: "#science" },
  { label: "Cases", href: "#cases" },
  { label: "FAQ", href: "#faq" },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--rule)]/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3.5 sm:px-5 md:px-10 md:py-4">
        <Link
          href="/"
          className="flex items-baseline gap-2 font-display text-[20px] leading-none tracking-tight text-foreground sm:text-[22px]"
        >
          <span
            className="italic"
            style={{ fontVariationSettings: "'WONK' 1" }}
          >
            Neureel
          </span>
          <span className="font-mono text-[9px] not-italic uppercase tracking-[0.3em] text-muted-foreground">
            v2
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:inline-flex">
            <span className="relative inline-flex size-1.5">
              <span className="absolute inset-0 animate-specimen-pulse rounded-full bg-[color:var(--signal-bio)]" />
              <span className="relative size-1.5 rounded-full bg-[color:var(--signal-bio)]" />
            </span>
            session · ready
          </span>
          <Link
            href="/sign-in"
            className="hidden font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            sign in
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "brand", size: "sm" })}
          >
            <span className="sm:hidden">Begin</span>
            <span className="hidden sm:inline">Begin analysis</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
