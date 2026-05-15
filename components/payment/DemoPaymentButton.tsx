"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductType } from "@/types/database";

type DemoPaymentButtonProps = {
  readingId: string;
  productType: ProductType;
  disabled: boolean;
};

type DemoPaymentResponse = {
  nextUrl?: string;
  error?: string;
};

export function DemoPaymentButton({
  readingId,
  productType,
  disabled,
}: DemoPaymentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function approveDemoPayment() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/demo/approve-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          readingId,
          productType,
        }),
      });
      const result = (await response.json()) as DemoPaymentResponse;

      if (!response.ok || !result.nextUrl) {
        throw new Error(result.error ?? "테스트 결제를 승인하지 못했습니다.");
      }

      router.push(result.nextUrl);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "테스트 결제를 승인하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-[2rem] border border-moss/25 bg-moss/10 p-4 shadow-sm">
      <div>
        <p className="text-sm font-black uppercase text-moss">테스트 결제</p>
        <h3 className="mt-2 text-lg font-black text-ink">
          테스트 결제 성공 처리
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          실제 결제가 발생하지 않는 데모 기능입니다. 카카오페이, PayPal, 카드
          API를 호출하지 않고 이 브라우저 세션 안에 approved mock payment를
          저장합니다.
        </p>
      </div>
      <button
        type="button"
        onClick={approveDemoPayment}
        disabled={disabled || isLoading}
        className="focus-ring mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-moss px-5 py-4 text-base font-black text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "테스트 결제 승인 중" : "테스트 결제 성공 처리"}
      </button>
      {error && (
        <p className="mt-4 rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      )}
    </div>
  );
}
