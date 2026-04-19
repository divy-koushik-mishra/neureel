import { ArrowRight, Brain, Gauge, Upload } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-brand/15 text-brand">
            <Brain className="size-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            Neureel
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "brand", size: "sm" })}
          >
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-16 pb-24 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Powered by Meta's TRIBE v2 neuroscience model
        </span>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Know why content goes viral.
          <br />
          <span className="text-muted-foreground">Before you publish.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Neureel predicts brain-region activation from your videos and images,
          turning neuroscience into a virality score you can act on.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "brand", size: "lg" })}
          >
            Analyze your first reel
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#how"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            How it works
          </Link>
        </div>
      </section>

      <section
        id="how"
        className="relative z-10 mx-auto grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3"
      >
        <FeatureCard
          icon={<Upload className="size-5" />}
          title="Upload in seconds"
          body="Drop a video or image. We handle storage, preprocessing, and routing to the GPU."
        />
        <FeatureCard
          icon={<Brain className="size-5" />}
          title="See brain activation"
          body="Interactive 3D brain viewer highlights which regions fire — reward, attention, emotion."
        />
        <FeatureCard
          icon={<Gauge className="size-5" />}
          title="Get a virality score"
          body="A 0–100 score weighted by regions that drive engagement, with concrete edit recommendations."
        />
      </section>

      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Neureel</span>
          <span>Built for brand & marketing teams</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex size-9 items-center justify-center rounded-md bg-brand/10 text-brand">
        {icon}
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}
