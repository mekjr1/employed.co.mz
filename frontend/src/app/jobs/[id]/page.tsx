import { headers } from "next/headers";
import { notFound } from "next/navigation";

import Container from "@/components/layout/Container";
import JobDetail from "@/components/jobs/JobDetail";
import { getJob } from "@/lib/api";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildJobMetadata, buildJobPostingJsonLd } from "@/lib/seo";

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
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? market.host;
  const job = await loadJob(id, host);

  if (!job) {
    return buildJobMetadata(
      {
        id,
        title: "Job not found",
        country: market.country,
        contact: "",
        jobtype: "Other",
        remote: false,
        status: "inactive",
        featured: false,
        created_at: new Date().toISOString()
      },
      market
    );
  }

  return buildJobMetadata(job, market);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? market.host;
  const job = await loadJob(id, host);

  if (!job) {
    notFound();
  }

  const jsonLd = buildJobPostingJsonLd(job, market);

  return (
    <Container className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <JobDetail job={job} market={market} />
    </Container>
  );
}
