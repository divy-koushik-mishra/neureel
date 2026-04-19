import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type BrainRegion, deriveRecommendations } from "@/lib/scoring";

export function Recommendations({ regions }: { regions: BrainRegion[] }) {
  const tips = deriveRecommendations(regions);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <CardTitle>Recommendations</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="mt-[6px] block size-1.5 shrink-0 rounded-full bg-brand" />
              <span className="text-foreground/90 leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
