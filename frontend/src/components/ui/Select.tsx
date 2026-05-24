import type { SelectHTMLAttributes } from "react";

import { classNames } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ label: string; value: string }>;
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300" htmlFor={fieldId}>
      <span className="font-medium text-zinc-100">{label}</span>
      <select
        id={fieldId}
        className={classNames(
          "h-11 rounded-xl border border-zinc-800 bg-[#111827] px-3 text-zinc-100 outline-none transition focus:border-indigo-500",
          error && "border-rose-500 focus:border-rose-500",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}
