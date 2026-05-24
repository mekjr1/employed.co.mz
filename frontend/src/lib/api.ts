import type { ApiErrorShape, Job, JobFormValues, JobsQuery, PaginatedResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorShape | string;

  constructor(message: string, status: number, payload?: ApiErrorShape | string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  host?: string;
  token?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: BodyInit | Record<string, unknown> | null;
}

function getClientToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("employed_token") ?? undefined;
}

function getClientHost(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.host;
}

function buildUrl(path: string, query?: ApiFetchOptions["query"]): string {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function normaliseBody(body: ApiFetchOptions["body"], headers: Headers): BodyInit | undefined {
  if (body == null) return undefined;
  if (typeof body === "string" || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    return body;
  }
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { host, token, query, body, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const resolvedHost = host ?? getClientHost();
  if (resolvedHost) {
    try {
      requestHeaders.set("Host", resolvedHost);
    } catch {
      // Browsers guard Host; keep the forwarded header as a fallback.
    }
    requestHeaders.set("X-Forwarded-Host", resolvedHost);
  }

  const resolvedToken = token ?? getClientToken();
  if (resolvedToken) {
    requestHeaders.set("Authorization", `Bearer ${resolvedToken}`);
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: requestHeaders,
    body: normaliseBody(body, requestHeaders)
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload?.detail === "string"
          ? payload.detail
          : payload?.message ?? `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function getJobs(query: JobsQuery, options: Omit<ApiFetchOptions, "query"> = {}) {
  return apiFetch<PaginatedResponse<Job>>("/api/jobs", {
    ...options,
    query: query as Record<string, string | number | boolean | undefined | null>,
    cache: options.cache ?? "no-store"
  });
}

export async function getJob(id: string, options: Omit<ApiFetchOptions, "query"> = {}) {
  return apiFetch<Job>(`/api/jobs/${id}`, {
    ...options,
    cache: options.cache ?? "no-store"
  });
}

export async function createJob(payload: JobFormValues, options: Omit<ApiFetchOptions, "body"> = {}) {
  return apiFetch<Job>("/api/jobs", {
    ...options,
    method: "POST",
    body: payload as unknown as Record<string, unknown>
  });
}

export async function updateJob(id: string, payload: Partial<JobFormValues> & { status?: string }, options: Omit<ApiFetchOptions, "body"> = {}) {
  return apiFetch<Job>(`/api/jobs/${id}`, {
    ...options,
    method: "PATCH",
    body: payload as unknown as Record<string, unknown>
  });
}

export async function deleteJob(id: string, options: Omit<ApiFetchOptions, "body"> = {}) {
  return apiFetch<void>(`/api/jobs/${id}`, {
    ...options,
    method: "DELETE"
  });
}
