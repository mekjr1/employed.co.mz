import type { InputHTMLAttributes } from "react";

import { classNames } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300" htmlFor={fieldId}>
      <span className="font-medium text-zinc-100">{label}</span>
      <input
        id={fieldId}
        className={classNames(
          "h-11 rounded-xl border border-zinc-800 bg-[#111827] px-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-indigo-500",
          error && "border-rose-500 focus:border-rose-500",
          className
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}
