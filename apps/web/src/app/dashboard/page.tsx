import { DashboardClient } from "./DashboardClient";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload content for analysis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop a video or image. Neureel routes it through TRIBE v2 and scores
          viral potential.
        </p>
      </section>
      <DashboardClient />
    </div>
  );
}
