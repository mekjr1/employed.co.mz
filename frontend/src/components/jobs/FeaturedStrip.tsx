import Link from "next/link";

import SalaryBadge from "@/components/jobs/SalaryBadge";
import { Badge } from "@/components/ui/Badge";
import type { Job } from "@/lib/types";

export default function FeaturedStrip({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-400">Featured jobs</p>
          <h2 className="text-2xl font-semibold text-zinc-100">Top visibility roles hiring now</h2>
        </div>
        <Link href="/jobs/new" className="hidden text-sm font-medium text-amber-300 hover:text-amber-200 sm:inline">
          Make your role featured
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {jobs.map((job) => (
          <article key={job.id} className="featured-surface flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="warning">Featured</Badge>
                  {job.remote ? <Badge variant="success">Remote</Badge> : null}
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">{job.title}</h3>
                <p className="mt-1 text-sm text-zinc-300">{job.company ?? "Independent employer"}</p>
              </div>
              <SalaryBadge job={job} />
            </div>
            <p className="text-sm text-zinc-300">{job.location ?? "Flexible location"}</p>
            <Link href={`/jobs/${job.id}`} className="mt-auto text-sm font-medium text-amber-200 hover:text-white">
              Explore opportunity →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
