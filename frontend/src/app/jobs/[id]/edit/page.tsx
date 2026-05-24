import { headers } from "next/headers";
import { notFound } from "next/navigation";

import Container from "@/components/layout/Container";
import JobForm from "@/components/jobs/JobForm";
import { getJob } from "@/lib/api";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildMetadata } from "@/lib/seo";

async function loadJob(id: string, host: string) {
  try {
    return await getJob(id, { host });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);

  return buildMetadata({
    title: `Edit job ${id}`,
    description: `Update your job listing details for ${market.siteName}. Editing requires the owner account.`,
    market,
    pathname: `/jobs/${id}/edit`
  });
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? market.host;
  const job = await loadJob(id, host);

  if (!job) {
    notFound();
  }

  return (
    <Container className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">Owner workflow</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Edit job listing</h1>
        <p className="max-w-3xl text-lg text-zinc-400">Update copy, compensation, or apply instructions. Authentication is enforced client-side by the shared auth hook.</p>
      </section>
      <JobForm mode="edit" job={job} />
    </Container>
  );
}
