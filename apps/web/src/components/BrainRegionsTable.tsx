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
          <TableHead className="w-[38%] sm:w-[22%]">Region</TableHead>
          <TableHead className="hidden sm:table-cell sm:w-[34%]">
            Function
          </TableHead>
          <TableHead className="w-[42%] sm:w-[32%]">Activation</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((region) => {
          const fn = region.function ?? REGION_FUNCTIONS[region.name] ?? "—";
          return (
            <TableRow key={region.name}>
              <TableCell className="font-medium">
                <span className="block truncate">
                  {prettyName(region.name)}
                </span>
                <span className="block text-[11px] text-muted-foreground sm:hidden">
                  {fn}
                </span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {fn}
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
          );
        })}
      </TableBody>
    </Table>
  );
}
