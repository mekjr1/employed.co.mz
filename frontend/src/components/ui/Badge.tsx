import type { PropsWithChildren } from "react";

import { classNames } from "@/lib/utils";

const variants = {
  default: "border-zinc-700 bg-zinc-900 text-zinc-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-300"
} as const;

export function Badge({ children, variant = "default", className }: PropsWithChildren<{ variant?: keyof typeof variants; className?: string }>) {
  return (
    <span className={classNames("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
