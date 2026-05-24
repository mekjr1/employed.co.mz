"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type VerifyState = "loading" | "success" | "already-verified" | "error";

export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const payload = await apiFetch<{ status?: string; message?: string }>(`/auth/verify-email/${token}`, {
          method: "POST",
          cache: "no-store",
        });
        if (!active) {
          return;
        }

        if (payload?.status === "already-verified") {
          setState("already-verified");
          setMessage(payload.message ?? "Your email is already verified.");
          return;
        }

        setState("success");
        setMessage(payload?.message ?? "Your email has been verified. You can now sign in.");
      } catch (verifyError) {
        if (!active) {
          return;
        }
        setState("error");
        setMessage(verifyError instanceof Error ? verifyError.message : "We could not verify this email link.");
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [token]);

  const tone = state === "error" ? "text-red-300" : state === "success" ? "text-emerald-200" : "text-[#a1a1aa]";

  return (
    <div className="rounded-3xl border border-white/10 bg-[#16213e] p-8 shadow-2xl shadow-black/30">
      <h1 className="text-3xl font-semibold text-[#e4e4e7]">Verify email</h1>
      <p className={`mt-4 text-sm ${tone}`}>{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-xl bg-[#4F46E5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4338ca]" href="/sign-in">
          Go to sign in
        </Link>
        <Link className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5" href="/">
          Return home
        </Link>
      </div>
    </div>
  );
}
