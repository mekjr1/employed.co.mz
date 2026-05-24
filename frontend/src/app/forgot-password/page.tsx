"use client";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#1a1a2e] px-4 py-16">
      <div className="mx-auto max-w-lg">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
