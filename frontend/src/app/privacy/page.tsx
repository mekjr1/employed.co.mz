import { headers } from "next/headers";

import Container from "@/components/layout/Container";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  return buildMetadata({
    title: "Privacy policy",
    description: `Review how ${market.siteName} handles employer and candidate data on the public job board.`,
    market,
    pathname: "/privacy"
  });
}

export default function PrivacyPage() {
  return (
    <Container className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Privacy policy</h1>
      </section>
      <article className="card-surface job-copy p-6">
        <p>Employed collects the details required to publish and manage public job listings, including employer contact information, listing content, and moderation metadata.</p>
        <p>Candidate traffic data may be used to improve search, ranking, moderation, and abuse prevention. Sensitive information should never be included in job descriptions or contact fields.</p>
        <p>Anonymous posting flows may use reCAPTCHA to reduce spam. Market-aware request headers help us resolve the correct country experience without asking job posters to reselect it.</p>
        <p>For privacy requests, corrections, or deletion requests, contact the operator using the employer support address configured for your market deployment.</p>
      </article>
    </Container>
  );
}
