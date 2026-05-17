"use client";

import { useState } from "react";
import type { ProductType } from "@/types/database";

type CheckoutPaymentButtonsProps = {
  readingId: string;
  productType: ProductType;
  disabled: boolean;
};

type CreatePaymentResponse = {
  paymentId?: string;
  nextUrl?: string;
  redirectUrl?: string;
  error?: string;
};

export function CheckoutPaymentButtons({
  readingId,
  productType,
  disabled,
}: CheckoutPaymentButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startKakaoPay() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/kakao/ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          readingId,
          productType,
        }),
      });
      const result = (await response.json()) as CreatePaymentResponse;
      const destination = result.redirectUrl ?? result.nextUrl;

      if (!response.ok || !destination) {
        throw new Error(result.error ?? "결제 대기 내역을 만들지 못했습니다.");
      }

      window.location.href = destination;
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "결제 대기 내역을 만들지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4">
      <div className="rounded-[2rem] border border-[#f0cf00]/50 bg-[#fff6b8] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#191919]">카카오페이로 결제하기</h3>
            <p className="mt-1 text-sm leading-6 text-[#4a3d00]/75">
              카카오페이 결제창으로 이동해 결제를 완료합니다.
            </p>
          </div>
          <span className="rounded-full bg-[#FEE500] px-3 py-1 text-xs font-black text-[#191919]">
            KakaoPay
          </span>
        </div>
        <button
          type="button"
          onClick={startKakaoPay}
          disabled={disabled || isLoading}
          className="focus-ring mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#FEE500] px-5 py-4 text-base font-black text-[#191919] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PawDecoration tone="dark" />
          {isLoading ? "카카오페이 결제 진행 중" : "카카오페이로 결제하기"}
        </button>
      </div>
      {error && (
        <p className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      )}
    </div>
  );
}

function PawDecoration({ tone }: { tone: "dark" | "light" }) {
  const color = tone === "dark" ? "bg-[#191919]/70" : "bg-white/85";

  return (
    <span aria-hidden className="mr-2 grid h-5 w-5 grid-cols-2 gap-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className={`col-span-2 mx-auto h-2.5 w-3.5 rounded-full ${color}`} />
    </span>
  );
}
