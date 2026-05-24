"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-[#0f172a]/70 px-4 py-3 text-sm text-[#e4e4e7] outline-none placeholder:text-[#71717a] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/30";

type ValidationState = "loading" | "valid" | "invalid";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const validate = async () => {
      try {
        await apiFetch<void>(`/auth/reset-password/${token}/validate`, { cache: "no-store" });
        if (active) {
          setValidationState("valid");
        }
      } catch {
        if (active) {
          setValidationState("invalid");
          setError("This reset link is invalid or has expired.");
        }
      }
    };

    void validate();
    return () => {
      active = false;
    };
  }, [token]);

  const passwordMismatch = useMemo(() => confirmPassword.length > 0 && confirmPassword !== password, [confirmPassword, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordMismatch) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch<void>(`/auth/reset-password/${token}`, {
        method: "POST",
        body: { password },
        cache: "no-store",
      });
      router.replace("/sign-in?reset=success");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to reset password.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (validationState === "loading") {
    return <div className="rounded-3xl border border-white/10 bg-[#16213e] p-8 text-sm text-[#a1a1aa]">Validating your reset link...</div>;
  }

  if (validationState === "invalid") {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-[#16213e] p-8 shadow-2xl shadow-black/30">
        <h1 className="text-3xl font-semibold text-[#e4e4e7]">Reset link unavailable</h1>
        <p className="mt-4 text-sm text-red-300">{error}</p>
        <Link className="mt-6 inline-flex text-sm font-medium text-[#F59E0B] hover:text-[#fbbf24]" href="/forgot-password">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#16213e] p-8 shadow-2xl shadow-black/30">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold text-[#e4e4e7]">Set a new password</h1>
        <p className="text-sm text-[#a1a1aa]">Choose a secure password for your Employed account.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#e4e4e7]" htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#e4e4e7]" htmlFor="reset-password-confirm">
            Confirm password
          </label>
          <input
            id="reset-password-confirm"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordMismatch ? <p className="text-xs text-red-300">Passwords do not match.</p> : null}
        </div>

        {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || password.length < 8 || passwordMismatch}
          className="w-full rounded-xl bg-[#4F46E5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
