import type { ButtonHTMLAttributes } from "react";

import { classNames } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-400",
  secondary: "border border-zinc-700 bg-[#16213e] text-zinc-100 hover:border-zinc-600 hover:bg-[#223053] focus-visible:ring-zinc-500",
  danger: "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-400",
  ghost: "text-zinc-200 hover:bg-white/5 focus-visible:ring-zinc-400"
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return classNames(
    "inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a2e] disabled:pointer-events-none disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export function Button({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
