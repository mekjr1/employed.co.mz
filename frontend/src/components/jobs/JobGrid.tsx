import { getTranslations } from "next-intl/server";

import JobCard from "@/components/jobs/JobCard";
import type { Job } from "@/lib/types";

export default async function JobGrid({
  jobs,
  locale = "en",
  emptyMessage,
  emptyTitle
}: {
  jobs: Job[];
  locale?: string;
  emptyMessage?: string;
  emptyTitle?: string;
}) {
  if (jobs.length === 0) {
    const t = await getTranslations("jobGrid");
    return (
      <div className="card-surface p-8 text-center text-zinc-400">
        <p className="text-lg font-medium text-zinc-200">{emptyTitle ?? t("emptyTitle")}</p>
        <p className="mt-2 text-sm">{emptyMessage ?? t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} locale={locale} />
      ))}
    </div>
  );
}
