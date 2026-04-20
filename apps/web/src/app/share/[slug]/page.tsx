import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";
import { SharedAnalysis } from "./SharedAnalysis";

export const metadata = {
  title: "Shared analysis",
  description: "Brain activation and virality score — shared via Neureel.",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
              <Brain className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Neureel
            </span>
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <span>Analyze your own</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <SharedAnalysis slug={slug} />
      </main>
    </div>
  );
}
