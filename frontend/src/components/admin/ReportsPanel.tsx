"use client";

interface ReportItem {
  id: string;
  jobTitle: string;
  reason: string;
  details?: string;
  createdAt?: string;
}

interface ReportsPanelProps {
  reports: ReportItem[];
  onResolve: (report: ReportItem) => Promise<void>;
  onDismiss: (report: ReportItem) => Promise<void>;
}

export function ReportsPanel({ reports, onResolve, onDismiss }: ReportsPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#16213e] p-5 shadow-lg shadow-black/20">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#e4e4e7]">Reports queue</h2>
        <p className="text-sm text-[#a1a1aa]">Review flagged community reports and close them with one click.</p>
      </div>
      <div className="space-y-3">
        {reports.length === 0 ? <p className="text-sm text-[#71717a]">No open reports.</p> : null}
        {reports.map((report) => (
          <div key={report.id} className="rounded-2xl border border-white/10 bg-[#0f172a]/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[#e4e4e7]">{report.jobTitle}</p>
                <p className="mt-1 text-sm text-[#F59E0B]">Reason: {report.reason}</p>
                {report.details ? <p className="mt-2 text-sm text-[#a1a1aa]">{report.details}</p> : null}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#71717a]">{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "New"}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void onResolve(report)}
                className="rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => void onDismiss(report)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
