import Link from "next/link";

import Container from "@/components/layout/Container";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#111827]/40 py-10">
      <Container className="flex flex-col gap-4 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-zinc-200">Employ<span className="text-amber-500">ed</span></p>
          <p>Local jobs. Local hiring.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/jobs" className="hover:text-white">
            Jobs
          </Link>
          <Link href="/jobs/new" className="hover:text-white">
            Post a job
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
        </div>
      </Container>
    </footer>
  );
}
