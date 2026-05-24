"use client";

import { useState } from "react";

const STATUSES = ["pending", "active", "flagged", "inactive", "filled"] as const;

interface BulkActionBarProps {
  selectedCount: number;
  onApply: (status: string, reason: string) => Promise<void>;
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, onApply, onClear }: BulkActionBarProps) {
  const [status, setStatus] = useState<string>("active");
  const [reason, setReason] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(status, reason);
      setReason("");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#16213e] p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <p className="text-sm font-medium text-[#e4e4e7]">{selectedCount} job{selectedCount === 1 ? "" : "s"} selected</p>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#0f172a]/70 px-4 py-3 text-sm text-[#e4e4e7] outline-none"
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              Set status: {option}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for this moderation action"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0f172a]/70 px-4 py-3 text-sm text-[#e4e4e7] outline-none placeholder:text-[#71717a]"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={isApplying}
            className="rounded-xl bg-[#4F46E5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? "Applying..." : "Apply to selection"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
