"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { JOB_TYPES } from "@/lib/constants";

interface JobFiltersProps {
  initialSearch?: string;
  initialJobType?: string;
  initialRemote?: boolean;
}

export default function JobFilters({ initialSearch = "", initialJobType = "", initialRemote = false }: JobFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [jobType, setJobType] = useState(initialJobType);
  const [remote, setRemote] = useState(initialRemote);

  function submit(nextPerPage?: string) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (jobType) params.set("job_type", jobType);
    if (remote) params.set("remote", "true");
    if (nextPerPage) params.set("per_page", nextPerPage);
    router.push(`/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_auto_auto] lg:items-end">
        <Input label="Search roles" name="search" placeholder="Title, company, or location" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select
          label="Job type"
          name="job_type"
          value={jobType}
          onChange={(event) => setJobType(event.target.value)}
          options={[{ label: "All job types", value: "" }, ...JOB_TYPES.map((type) => ({ label: type, value: type }))]}
        />
        <label className="flex h-11 items-center gap-3 rounded-xl border border-zinc-800 bg-[#111827] px-4 text-sm text-zinc-300">
          <input type="checkbox" checked={remote} onChange={(event) => setRemote(event.target.checked)} className="size-4 rounded border-zinc-600 bg-zinc-950 text-indigo-500" />
          Remote only
        </label>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => submit()}>
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setJobType("");
              setRemote(false);
              router.push("/jobs");
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
