"use client";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-300 border-amber-400/20",
  active: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
  flagged: "bg-red-400/15 text-red-300 border-red-400/20",
  inactive: "bg-white/10 text-[#d4d4d8] border-white/10",
  filled: "bg-sky-400/15 text-sky-300 border-sky-400/20",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[normalized] ?? STATUS_STYLES.inactive}`}>
      {normalized}
    </span>
  );
}
