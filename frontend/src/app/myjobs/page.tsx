"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MyJobCard } from "@/components/dashboard/MyJobCard";
import { FeatureJobModal } from "@/components/dashboard/FeatureJobModal";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, deleteJob, updateJob } from "@/lib/api";
import type { Job } from "@/lib/types";

type DashboardJob = Job & {
  _id?: string;
  id?: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  marketKey?: string;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  featuredThrough?: string | null;
  featured_through?: string | null;
};

function MyJobsContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [featureJob, setFeatureJob] = useState<DashboardJob | null>(null);

  const loadJobs = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const payload = await apiFetch<{ items?: DashboardJob[]; jobs?: DashboardJob[] } | DashboardJob[]>("/jobs/mine", {
        cache: "no-store",
      });
      setJobs(Array.isArray(payload) ? payload : payload.items ?? payload.jobs ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your jobs.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/sign-in?redirect=/myjobs");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (user) {
      void loadJobs();
    }
  }, [loadJobs, user]);

  const activeJobs = useMemo(() => jobs.filter((job) => (job.status ?? "").toLowerCase() === "active"), [jobs]);

  const handleDelete = async (job: DashboardJob) => {
    if (!window.confirm(`Delete “${job.title ?? "this job"}”?`)) {
      return;
    }

    await deleteJob(job.id ?? job._id ?? "");
    await loadJobs();
  };

  const handleDeactivate = async (job: DashboardJob) => {
    const nextStatus = window.prompt("Type the new status: inactive or filled", "inactive");
    if (!nextStatus || !["inactive", "filled"].includes(nextStatus)) {
      return;
    }

    await updateJob(job.id ?? job._id ?? "", { status: nextStatus });
    await loadJobs();
  };

  return (
    <main className="min-h-screen bg-[#1a1a2e] px-4 py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#e4e4e7]">My jobs</h1>
            <p className="mt-2 text-sm text-[#a1a1aa]">Manage your listings, promotions, and post status changes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#16213e] px-4 py-3 text-sm text-[#a1a1aa]">
            {activeJobs.length} active job{activeJobs.length === 1 ? "" : "s"}
          </div>
        </div>

        {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        {isFetching ? <p className="text-sm text-[#a1a1aa]">Loading your jobs...</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <MyJobCard
              key={job.id ?? job._id}
              job={job}
              onDelete={(selectedJob) => void handleDelete(selectedJob)}
              onDeactivate={(selectedJob) => void handleDeactivate(selectedJob)}
              onFeature={(selectedJob) => setFeatureJob(selectedJob)}
            />
          ))}
        </div>

        {!isFetching && jobs.length === 0 ? <p className="text-sm text-[#71717a]">You have not posted any jobs yet.</p> : null}
      </div>

      <FeatureJobModal
        isOpen={!!featureJob}
        jobId={featureJob?.id ?? featureJob?._id ?? ""}
        jobTitle={featureJob?.title ?? "Untitled job"}
        marketKey={featureJob?.marketKey}
        onClose={() => setFeatureJob(null)}
        onCompleted={() => void loadJobs()}
      />
    </main>
  );
}

export default function MyJobsPage() {
  return <MyJobsContent />;
}
