import Link from "next/link";
import { getTranslations } from "next-intl/server";

import SalaryBadge from "@/components/jobs/SalaryBadge";
import { Badge } from "@/components/ui/Badge";
import type { Job } from "@/lib/types";

export default async function FeaturedStrip({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return null;
  }

  const tStrip = await getTranslations("featuredStrip");
  const tJobs = await getTranslations("jobs");

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-400">{tStrip("kicker")}</p>
          <h2 className="text-2xl font-semibold text-zinc-100">{tStrip("title")}</h2>
        </div>
        <Link href="/jobs/new" className="hidden text-sm font-medium text-amber-300 hover:text-amber-200 sm:inline">
          {tStrip("makeFeatured")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {jobs.map((job) => (
          <article key={job.id} className="featured-surface flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="warning">{tJobs("featuredBadge")}</Badge>
                  {job.remote ? <Badge variant="success">{tJobs("remoteBadge")}</Badge> : null}
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">{job.title}</h3>
                <p className="mt-1 text-sm text-zinc-300">{job.company ?? tJobs("independentEmployer")}</p>
              </div>
              <SalaryBadge job={job} />
            </div>
            <p className="text-sm text-zinc-300">{job.location ?? tJobs("flexibleLocation")}</p>
            <Link href={`/jobs/${job.id}`} className="mt-auto text-sm font-medium text-amber-200 hover:text-white">
              {tStrip("exploreOpportunity")} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
