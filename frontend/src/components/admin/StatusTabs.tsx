"use client";

const OPTIONS = ["pending", "active", "flagged", "inactive", "filled", "all"] as const;

interface StatusTabsProps {
  value: string;
  counts: Partial<Record<(typeof OPTIONS)[number], number>>;
  onChange: (value: string) => void;
}

export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {OPTIONS.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active ? "bg-[#4F46E5] text-white" : "border border-white/10 bg-[#16213e] text-[#a1a1aa] hover:bg-white/5"
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
            <span className="ml-2 text-xs opacity-80">{counts[option] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
