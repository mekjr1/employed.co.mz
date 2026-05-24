"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/lib/types";
import { BulkActionBar } from "./BulkActionBar";
import { StatusBadge } from "./StatusBadge";

type AdminJob = Job & {
  _id?: string;
  id?: string;
  title?: string | null;
  company?: string | null;
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  userName?: string | null;
  owner_name?: string | null;
  poster?: { name?: string | null; email?: string | null };
};

interface AdminJobTableProps {
  jobs: AdminJob[];
  selectedIds: string[];
  onToggleSelection: (jobId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onBulkApply: (status: string, reason: string) => Promise<void>;
  onClearSelection: () => void;
  onRowStatusChange: (job: AdminJob, status: string, reason: string) => Promise<void>;
}

function jobId(job: AdminJob) {
  return job.id ?? job._id ?? "";
}

export function AdminJobTable({
  jobs,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onBulkApply,
  onClearSelection,
  onRowStatusChange,
}: AdminJobTableProps) {
  const [rowReasons, setRowReasons] = useState<Record<string, string>>({});
  const [rowStatuses, setRowStatuses] = useState<Record<string, string>>({});
  const allSelected = useMemo(() => jobs.length > 0 && jobs.every((job) => selectedIds.includes(jobId(job))), [jobs, selectedIds]);

  useEffect(() => {
    setRowStatuses(
      Object.fromEntries(jobs.map((job) => [jobId(job), job.status ?? "pending"])),
    );
  }, [jobs]);

  return (
    <div className="space-y-4">
      <BulkActionBar selectedCount={selectedIds.length} onApply={onBulkApply} onClear={onClearSelection} />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16213e] shadow-lg shadow-black/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-[#e4e4e7]">
            <thead className="bg-[#0f172a]/70 text-xs uppercase tracking-[0.2em] text-[#71717a]">
              <tr>
                <th className="px-4 py-4">
                  <input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} />
                </th>
                <th className="px-4 py-4">Title</th>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4">Posted</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Poster</th>
                <th className="px-4 py-4">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {jobs.map((job) => {
                const id = jobId(job);
                return (
                  <tr key={id} className="align-top">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => onToggleSelection(id)} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-[#e4e4e7]">{job.title ?? "Untitled job"}</div>
                    </td>
                    <td className="px-4 py-4 text-[#a1a1aa]">{job.company ?? "Unknown company"}</td>
                    <td className="px-4 py-4 text-[#a1a1aa]">{job.createdAt ?? job.created_at ? new Date(job.createdAt ?? job.created_at ?? "").toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={job.status ?? "inactive"} />
                    </td>
                    <td className="px-4 py-4 text-[#a1a1aa]">{job.poster?.name ?? job.userName ?? job.owner_name ?? job.poster?.email ?? "Unknown poster"}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-3">
                        <select
                          value={rowStatuses[id] ?? job.status ?? "pending"}
                          onChange={(event) => setRowStatuses((current) => ({ ...current, [id]: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-[#0f172a]/70 px-3 py-2 text-sm text-[#e4e4e7] outline-none"
                        >
                          {['pending', 'active', 'flagged', 'inactive', 'filled'].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <input
                          value={rowReasons[id] ?? ""}
                          onChange={(event) => setRowReasons((current) => ({ ...current, [id]: event.target.value }))}
                          placeholder="Reason for update"
                          className="w-full rounded-xl border border-white/10 bg-[#0f172a]/70 px-3 py-2 text-sm text-[#e4e4e7] outline-none placeholder:text-[#71717a]"
                        />
                        <button
                          type="button"
                          onClick={() => void onRowStatusChange(job, rowStatuses[id] ?? job.status ?? "pending", rowReasons[id] ?? "")}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5"
                        >
                          Save reason
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#71717a]">
                    No jobs found for this status.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
