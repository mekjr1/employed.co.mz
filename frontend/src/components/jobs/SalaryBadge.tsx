import { Badge } from "@/components/ui/Badge";
import type { Job } from "@/lib/types";
import { formatSalary } from "@/lib/utils";

export default function SalaryBadge({ job }: { job: Pick<Job, "salary_min" | "salary_max" | "salary_currency" | "salary_period"> }) {
  const salary = formatSalary(job);

  if (!salary) {
    return null;
  }

  return <Badge variant="info">{salary}</Badge>;
}
