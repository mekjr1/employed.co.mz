"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminJobTable } from "@/components/admin/AdminJobTable";
import { AdminUsersList } from "@/components/admin/AdminUsersList";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import type { AuthUser, Job } from "@/lib/types";

type AdminJob = Job & {
  _id?: string;
  id?: string;
  title?: string | null;
  status?: string | null;
  company?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  userName?: string | null;
  owner_name?: string | null;
  poster?: { name?: string | null; email?: string | null };
};

type AdminUser = AuthUser & {
  _id?: string;
  id?: string;
  roles?: string[];
  name?: string;
  email?: string;
};

type ReportItem = {
  id: string;
  jobTitle: string;
  reason: string;
  details?: string;
  createdAt?: string;
};

function jobId(job: AdminJob) {
  return job.id ?? job._id ?? "";
}

function AdminJobsContent() {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth();
  const [status, setStatus] = useState("pending");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/sign-in?redirect=/admin/jobs");
      return;
    }

    if (!isLoading && user && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, router, user]);

  const loadAdminState = useCallback(async () => {
    setError(null);
    try {
      const [jobsPayload, usersPayload, reportsPayload] = await Promise.all([
        apiFetch<{ jobs?: AdminJob[]; counts?: Record<string, number> } | AdminJob[]>("/admin/jobs", {
          query: { status },
          cache: "no-store",
        }),
        apiFetch<{ users?: AdminUser[] } | AdminUser[]>("/admin/users", { cache: "no-store" }),
        apiFetch<{ reports?: ReportItem[] } | ReportItem[]>("/admin/reports", { cache: "no-store" }),
      ]);

      setJobs(Array.isArray(jobsPayload) ? jobsPayload : jobsPayload.jobs ?? []);
      setCounts(Array.isArray(jobsPayload) ? {} : jobsPayload.counts ?? {});
      setAdminUsers(Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? []);
      setReports(Array.isArray(reportsPayload) ? reportsPayload : reportsPayload.reports ?? []);
      setSelectedIds([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load moderation dashboard.");
    }
  }, [status]);

  useEffect(() => {
    if (user && isAdmin) {
      void loadAdminState();
    }
  }, [isAdmin, loadAdminState, user]);

  const handleToggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const handleToggleAll = (checked: boolean) => {
    setSelectedIds(checked ? jobs.map((job) => jobId(job)) : []);
  };

  const handleBulkApply = async (nextStatus: string, reason: string) => {
    await apiFetch<void>("/admin/jobs/bulk-status", {
      method: "PATCH",
      body: {
        ids: selectedIds,
        status: nextStatus,
        reason,
      },
      cache: "no-store",
    });
    await loadAdminState();
  };

  const handleRowStatusChange = async (job: AdminJob, nextStatus: string, reason: string) => {
    await apiFetch<void>(`/admin/jobs/${jobId(job)}/status`, {
      method: "PATCH",
      body: { status: nextStatus, reason },
      cache: "no-store",
    });
    await loadAdminState();
  };

  const handleGrantAdmin = async (adminUser: AdminUser) => {
    await apiFetch<void>(`/admin/users/${adminUser.id ?? adminUser._id}/grant-role`, {
      method: "POST",
      body: { role: "admin" },
      cache: "no-store",
    });
    await loadAdminState();
  };

  const handleRevokeAdmin = async (adminUser: AdminUser) => {
    await apiFetch<void>(`/admin/users/${adminUser.id ?? adminUser._id}/revoke-role`, {
      method: "POST",
      body: { role: "admin" },
      cache: "no-store",
    });
    await loadAdminState();
  };

  const handleResolveReport = async (report: ReportItem) => {
    await apiFetch<void>(`/admin/reports/${report.id}/resolve`, { method: "POST", cache: "no-store" });
    await loadAdminState();
  };

  const handleDismissReport = async (report: ReportItem) => {
    await apiFetch<void>(`/admin/reports/${report.id}/dismiss`, { method: "POST", cache: "no-store" });
    await loadAdminState();
  };

  const derivedCounts = useMemo(() => ({ ...counts, [status]: counts[status] ?? jobs.length }), [counts, jobs.length, status]);

  return (
    <main className="min-h-screen bg-[#1a1a2e] px-4 py-12">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-[#e4e4e7]">Admin job moderation</h1>
            <p className="text-sm text-[#a1a1aa]">Review submissions, update statuses, and manage moderation operations.</p>
          </div>

          <StatusTabs value={status} counts={derivedCounts} onChange={setStatus} />
          {error ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
          <AdminJobTable
            jobs={jobs}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            onToggleAll={handleToggleAll}
            onBulkApply={handleBulkApply}
            onClearSelection={() => setSelectedIds([])}
            onRowStatusChange={handleRowStatusChange}
          />
        </section>

        <aside className="space-y-6">
          <AdminUsersList users={adminUsers} onGrant={handleGrantAdmin} onRevoke={handleRevokeAdmin} />
          <ReportsPanel reports={reports} onResolve={handleResolveReport} onDismiss={handleDismissReport} />
        </aside>
      </div>
    </main>
  );
}

export default function AdminJobsPage() {
  return <AdminJobsContent />;
}
