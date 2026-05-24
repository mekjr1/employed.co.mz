"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type PaymentState = "pending" | "awaiting_user" | "completed" | "failed" | "cancelled" | "expired";

interface PaymentPollerProps {
  paymentId: string;
  onResolved: (status: PaymentState, payload: Record<string, unknown>) => void;
  onCancel?: () => Promise<void>;
}


export function PaymentPoller({ paymentId, onResolved, onCancel }: PaymentPollerProps) {
  const [status, setStatus] = useState<PaymentState>("awaiting_user");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const payload = await apiFetch<Record<string, unknown>>(`/payments/${paymentId}/status`, { cache: "no-store" });
        const nextStatus = (payload.status as PaymentState | undefined) ?? "pending";
        if (!active) {
          return;
        }

        setStatus(nextStatus);
        setFailureReason((payload.failureReason as string | undefined) ?? null);

        if (["completed", "failed", "cancelled", "expired"].includes(nextStatus)) {
          onResolved(nextStatus, payload);
        }
      } catch {
        if (active) {
          setFailureReason("Unable to refresh payment status.");
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [onResolved, paymentId]);

  const handleCancel = async () => {
    if (!onCancel) {
      return;
    }

    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 animate-pulse rounded-full bg-[#F59E0B]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#e4e4e7]">Payment status: {status.replace(/_/g, " ")}</p>
          <p className="text-sm text-[#a1a1aa]">Check your phone to approve the request. We refresh every 3 seconds.</p>
          {failureReason ? <p className="text-sm text-red-300">{failureReason}</p> : null}
        </div>
      </div>

      {onCancel ? (
        <button
          type="button"
          disabled={isCancelling}
          onClick={() => void handleCancel()}
          className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#e4e4e7] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCancelling ? "Cancelling..." : "Cancel payment"}
        </button>
      ) : null}
    </div>
  );
}
