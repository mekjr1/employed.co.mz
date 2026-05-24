import { headers } from "next/headers";

import Container from "@/components/layout/Container";
import JobForm from "@/components/jobs/JobForm";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  return buildMetadata({
    title: "Post a job",
    description: `Publish a new public job listing for ${market.country}. Featured upgrades are priced per market and anonymous posters use reCAPTCHA verification.`,
    market,
    pathname: "/jobs/new"
  });
}

export default async function NewJobPage() {
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);

  return (
    <Container className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">Employer workflow</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Post a job in {market.country}</h1>
        <p className="max-w-3xl text-lg text-zinc-400">Add a market-specific public listing with salary guidance, rich-text detail, optional WhatsApp apply, and built-in spam protection.</p>
      </section>
      <JobForm mode="create" />
    </Container>
  );
}
