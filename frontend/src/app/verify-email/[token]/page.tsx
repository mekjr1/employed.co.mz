"use client";

import { use } from "react";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export default function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <main className="min-h-screen bg-[#1a1a2e] px-4 py-16">
      <div className="mx-auto max-w-lg">
        <VerifyEmail token={token} />
      </div>
    </main>
  );
}
