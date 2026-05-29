"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { PER_PAGE_OPTIONS } from "@/lib/constants";

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  pathname: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export default function Pagination({ page, perPage, total, totalPages, pathname, params = {} }: PaginationProps) {
  const router = useRouter();
  const t = useTranslations("pagination");

  function navigate(nextPage: number, nextPerPage = perPage) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === false) return;
      query.set(key, String(value));
    });
    query.set("page", String(nextPage));
    query.set("per_page", String(nextPerPage));
    router.push(`${pathname}?${query.toString()}`);
  }

  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="card-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm text-zinc-400">
        <p className="text-zinc-200">{t("showing", { start, end, total })}</p>
        <label className="inline-flex items-center gap-2">
          <span>{t("perPage")}</span>
          <select
            className="rounded-lg border border-zinc-700 bg-[#111827] px-3 py-2 text-zinc-100 outline-none"
            value={perPage}
            onChange={(event) => navigate(1, Number(event.target.value))}
          >
            {PER_PAGE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => navigate(page - 1)}>
          {t("previous")}
        </Button>
        <span className="text-sm text-zinc-400">
          {t("pageOf", { page, total: Math.max(totalPages, 1) })}
        </span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => navigate(page + 1)}>
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
