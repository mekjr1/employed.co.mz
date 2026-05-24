"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { Job } from "@/lib/types";

type DashboardJob = Job & {
  _id?: string;
  id?: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  featuredThrough?: string | null;
  featured_through?: string | null;
};

interface MyJobCardProps {
  job: DashboardJob;
  onDelete: (job: DashboardJob) => void;
  onDeactivate: (job: DashboardJob) => void;
  onFeature: (job: DashboardJob) => void;
}

function jobId(job: DashboardJob) {
  return job.id ?? job._id ?? "";
}

export function MyJobCard({ job, onDelete, onDeactivate, onFeature }: MyJobCardProps) {
  const id = jobId(job);
  const featuredThrough = job.featuredThrough ?? job.featured_through ?? null;
  const createdAt = job.createdAt ?? job.created_at ?? null;
  const isFeatured = !!featuredThrough && new Date(featuredThrough).getTime() > Date.now();

  return (
    <article className="rounded-2xl border border-white/10 bg-[#16213e] p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#e4e4e7]">{job.title ?? "Untitled job"}</h2>
          <p className="text-sm text-[#a1a1aa]">{job.company ?? "Unknown company"}</p>
          <p className="text-sm text-[#71717a]">{job.location ?? "Location not specified"}</p>
        </div>
        <div className="space-y-2 text-right">
          <StatusBadge status={job.status ?? "inactive"} />
          {isFeatured ? <p className="text-xs uppercase tracking-[0.2em] text-[#F59E0B]">Featured</p> : null}
        </div>
      </div>

      <p className="mt-4 text-sm text-[#71717a]">Posted {createdAt ? new Date(createdAt).toLocaleDateString() : "recently"}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/jobs/${id}/edit`}
          className="rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDelete(job)}
          className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => onDeactivate(job)}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5"
        >
          Mark inactive / filled
        </button>
        <button
          type="button"
          onClick={() => onFeature(job)}
          className="rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#1a1a2e] transition hover:bg-[#fbbf24]"
        >
          Feature
        </button>
      </div>
    </article>
  );
}
