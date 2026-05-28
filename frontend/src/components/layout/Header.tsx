"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Container from "@/components/layout/Container";
import { Button, buttonStyles } from "@/components/ui/Button";
import { LOCALE_OPTIONS } from "@/lib/constants";
import { MARKETS } from "@/lib/market";
import { classNames } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useMarket } from "@/hooks/useMarket";

export default function Header() {
  const { market, switchMarket } = useMarket();
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("employed_locale") ?? market.locale.slice(0, 2).toLowerCase();
    setLocale(storedLocale);
  }, [market.locale]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#1a1a2e]/95 backdrop-blur">
      <Container className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black tracking-tight text-zinc-100">
            Employ<span className="text-amber-500">ed</span>
          </Link>

          <nav className="hidden items-center gap-3 text-sm text-zinc-300 md:flex">
            <Link href="/jobs" className="transition hover:text-white">
              Browse jobs
            </Link>
            <Link href="/jobs/new" className="transition hover:text-white">
              Post a job
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
          </nav>
        </div>

        {/* Mobile-only primary navigation row — visible below md breakpoint */}
        <nav className="flex items-center gap-4 text-sm text-zinc-300 md:hidden">
          <Link href="/jobs" className="font-medium transition hover:text-white">
            Browse jobs
          </Link>
          <Link href="/jobs/new" className="transition hover:text-white">
            Post a job
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-[#16213e] px-3 py-2 text-sm text-zinc-300">
            <span className="text-zinc-400">Market</span>
            <select
              className="bg-transparent text-white outline-none"
              value={market.key}
              onChange={(event) => switchMarket(event.target.value as keyof typeof MARKETS)}
            >
              {Object.values(MARKETS).map((item) => (
                <option key={item.key} value={item.key} className="bg-[#16213e] text-white">
                  {item.siteName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-[#16213e] px-3 py-2 text-sm text-zinc-300">
            <span className="text-zinc-400">Locale</span>
            <select
              className="bg-transparent text-white outline-none"
              value={locale}
              onChange={(event) => {
                const value = event.target.value;
                setLocale(value);
                window.localStorage.setItem("employed_locale", value);
              }}
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#16213e] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <Link href="/jobs/new" className={buttonStyles({ variant: "primary", size: "sm" })}>
              Post a job
            </Link>
            {loading ? null : isAuthenticated ? (
              <>
                <span className={classNames("hidden text-sm text-zinc-400 sm:inline", user?.name && "text-zinc-200")}>{user?.name ?? "Signed in"}</span>
                <Button variant="secondary" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href={process.env.NEXT_PUBLIC_SIGN_IN_URL ?? "/sign-in"} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Sign in
                </Link>
                <Link href={process.env.NEXT_PUBLIC_SIGN_UP_URL ?? "/sign-up"} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
