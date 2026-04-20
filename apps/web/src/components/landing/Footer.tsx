import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-[color:var(--paper)]/60">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 sm:py-12 md:px-10 md:py-16">
        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-baseline gap-2">
              <span
                className="font-display text-[28px] italic leading-none tracking-tight text-foreground"
                style={{ fontVariationSettings: "'WONK' 1" }}
              >
                Neureel
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
                v2
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.65] text-muted-foreground">
              A foundation model of the cortex, now legible to the people making
              the feed.
            </p>
            <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              <span>[LAT 12.97 · LON 77.59]</span>
              <br />
              <span className="opacity-70">
                specimen · 001 · deposited 2026
              </span>
            </div>
          </div>

          <FooterCol
            title="Product"
            items={[
              { label: "Analyze", href: "/sign-in" },
              { label: "Method", href: "#method" },
              { label: "Atlas", href: "#" },
              { label: "API", href: "#" },
            ]}
          />
          <FooterCol
            title="Science"
            items={[
              { label: "TRIBE v2", href: "#science" },
              { label: "Paper", href: "#" },
              { label: "Changelog", href: "#" },
              { label: "Lab notes", href: "#" },
            ]}
          />
          <FooterCol
            title="Company"
            items={[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Contact", href: "mailto:hello@neureel.com" },
              { label: "Careers", href: "#" },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[color:var(--rule)] pt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70 sm:mt-14 sm:tracking-[0.28em] md:flex-row md:items-center">
          <span>© {year} Neureel · Built for brand & marketing teams</span>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <span>cortex-first · proxy-free</span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1 animate-specimen-pulse rounded-full bg-[color:var(--signal-bio)]" />
              session · ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
