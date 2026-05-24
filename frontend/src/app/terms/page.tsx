import { headers } from "next/headers";

import Container from "@/components/layout/Container";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  return buildMetadata({
    title: "Terms of service",
    description: `Review the public job board terms for employers and job seekers using ${market.siteName}.`,
    market,
    pathname: "/terms"
  });
}

export default function TermsPage() {
  return (
    <Container className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Terms of service</h1>
      </section>
      <article className="card-surface job-copy p-6">
        <p>Employers are responsible for the accuracy, legality, and currency of their listings. Roles that are misleading, discriminatory, illegal, or fraudulent may be removed without notice.</p>
        <p>Featured placement is a paid promotional option that improves prominence only. It does not guarantee applications, hiring outcomes, or exclusive access to candidates.</p>
        <p>Applicants should verify employer identity before sharing personal information. Employed is a marketplace surface and does not become a party to employment contracts or disputes.</p>
        <p>Continued use of the platform constitutes acceptance of these terms and any related moderation, payment, and anti-abuse policies that apply in the active market.</p>
      </article>
    </Container>
  );
}
