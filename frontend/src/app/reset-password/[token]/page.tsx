"use client";

import { use } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <main className="min-h-screen bg-[#1a1a2e] px-4 py-16">
      <div className="mx-auto max-w-lg">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
