import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/generated/prisma/enums";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>;
    case "PROCESSING":
      return <Badge variant="info">Processing</Badge>;
    case "PENDING":
      return <Badge variant="muted">Pending</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
  }
}
