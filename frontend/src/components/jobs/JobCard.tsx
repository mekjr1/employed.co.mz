import Link from "next/link";

import SalaryBadge from "@/components/jobs/SalaryBadge";
import { Badge } from "@/components/ui/Badge";
import type { Job } from "@/lib/types";
import { formatDate, truncateHtml } from "@/lib/utils";

export default function JobCard({ job, locale = "en-US" }: { job: Job; locale?: string }) {
  return (
    <article className="card-surface flex h-full flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {job.featured ? <Badge variant="warning">Featured</Badge> : null}
            {job.remote ? <Badge variant="success">Remote</Badge> : null}
            <Badge>{job.jobtype}</Badge>
          </div>
          <Link href={`/jobs/${job.id}`} className="text-xl font-semibold text-zinc-100 transition hover:text-indigo-300">
            {job.title}
          </Link>
          <p className="text-sm text-zinc-400">{job.company ?? "Independent employer"}</p>
        </div>
        <SalaryBadge job={job} />
      </div>

      <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
        <p>{job.location ?? "Location flexible"}</p>
        <p>{job.country}</p>
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-zinc-300">{truncateHtml(job.html_description ?? job.description ?? "", 180)}</p>

      <div className="mt-auto flex items-center justify-between pt-2 text-sm text-zinc-500">
        <span>Posted {formatDate(job.published_at ?? job.created_at, locale)}</span>
        <Link href={`/jobs/${job.id}`} className="font-medium text-indigo-300 hover:text-indigo-200">
          View role →
        </Link>
      </div>
    </article>
  );
}
