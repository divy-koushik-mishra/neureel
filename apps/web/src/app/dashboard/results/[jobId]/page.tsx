import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ResultsClient } from "./ResultsClient";

export const metadata = {
  title: "Analysis results",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <ResultsClient jobId={jobId} />
    </div>
  );
}
