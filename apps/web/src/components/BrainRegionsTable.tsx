import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BrainRegion } from "@/lib/scoring";
import { REGION_FUNCTIONS } from "@/lib/scoring";

const prettyName = (raw: string) =>
  raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function BrainRegionsTable({ regions }: { regions: BrainRegion[] }) {
  const sorted = [...regions].sort((a, b) => b.activation - a.activation);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[24%]">Region</TableHead>
          <TableHead className="w-[34%]">Function</TableHead>
          <TableHead className="w-[32%]">Activation</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((region) => (
          <TableRow key={region.name}>
            <TableCell className="font-medium">
              {prettyName(region.name)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {region.function ?? REGION_FUNCTIONS[region.name] ?? "—"}
            </TableCell>
            <TableCell>
              <Progress
                value={Math.round(region.activation * 100)}
                tone="brand"
              />
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {region.activation.toFixed(3)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
