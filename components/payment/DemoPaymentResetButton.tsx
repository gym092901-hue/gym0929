"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductType } from "@/types/database";

type DemoPaymentResetButtonProps = {
  readingId: string;
  productType: ProductType;
};

type DemoResetResponse = {
  error?: string;
};

export function DemoPaymentResetButton({
  readingId,
  productType,
}: DemoPaymentResetButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function resetDemoPayment() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/demo/reset-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          readingId,
          productType,
        }),
      });
      const result = (await response.json()) as DemoResetResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "데모 결제 상태를 초기화하지 못했습니다.");
      }

      router.refresh();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "데모 결제 상태를 초기화하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={resetDemoPayment}
        disabled={isLoading}
        className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-berry/20 bg-white px-5 py-3 text-sm font-black text-berry transition hover:border-berry/40 hover:bg-berry/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "초기화 중" : "데모 결제 상태 초기화"}
      </button>
      {error ? (
        <p className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      ) : null}
    </div>
  );
}
