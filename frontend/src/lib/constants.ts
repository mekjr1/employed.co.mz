import type { JobStatus, JobType, SalaryCurrency, SalaryPeriod } from "@/lib/types";

export const JOB_TYPES: JobType[] = [
  "Full Time",
  "Part Time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
  "Remote",
  "Volunteer",
  "Other"
];

export const COUNTRIES = ["Mexico", "Mozambique"] as const;
export const STATUSES: JobStatus[] = ["pending", "active", "flagged", "inactive", "filled"];
export const SALARY_CURRENCIES: SalaryCurrency[] = ["MXN", "MZN", "USD", "EUR", "ZAR"];
export const SALARY_PERIODS: SalaryPeriod[] = ["hour", "day", "week", "month", "year"];
export const PER_PAGE_OPTIONS = [12, 24, 48] as const;
export const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" }
] as const;
