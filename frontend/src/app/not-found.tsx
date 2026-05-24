import Link from "next/link";
import { headers } from "next/headers";

import Container from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/Button";
import { resolveMarketFromHeaders } from "@/lib/market";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const requestHeaders = await headers();
  const market = resolveMarketFromHeaders(requestHeaders);
  return buildMetadata({
    title: "Page not found",
    description: `The page you requested could not be found on ${market.siteName}.`,
    market,
    pathname: "/404"
  });
}

export default function NotFound() {
  return (
    <Container>
      <section className="card-surface mx-auto max-w-3xl space-y-5 px-6 py-12 text-center sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">404</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100">We couldn’t find that page.</h1>
        <p className="text-lg text-zinc-400">The listing or route may have been removed, renamed, or never existed in this market.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonStyles({ variant: "primary", size: "lg" })}>
            Back home
          </Link>
          <Link href="/jobs" className={buttonStyles({ variant: "secondary", size: "lg" })}>
            Browse jobs
          </Link>
        </div>
      </section>
    </Container>
  );
}
