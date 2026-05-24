import type { PropsWithChildren } from "react";

import { classNames } from "@/lib/utils";

export default function Container({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={classNames("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
