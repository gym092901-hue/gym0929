"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DemoPremiumDirectButtonProps = {
  readingId: string;
};

type DemoApproveResponse = {
  nextUrl?: string;
  error?: string;
};

export function DemoPremiumDirectButton({
  readingId,
}: DemoPremiumDirectButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPremiumDemo() {
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
          productType: "premium_report",
        }),
      });
      const result = (await response.json()) as DemoApproveResponse;

      if (!response.ok || !result.nextUrl) {
        throw new Error(result.error ?? "데모 결제를 승인하지 못했습니다.");
      }

      router.push(result.nextUrl);
    } catch (demoError) {
      setError(
        demoError instanceof Error
          ? demoError.message
          : "데모 결제를 승인하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-3 grid gap-3">
      <button
        type="button"
        onClick={openPremiumDemo}
        disabled={isLoading}
        className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-full border border-berry/15 bg-white px-5 py-3 text-sm font-black text-berry shadow-sm transition hover:border-berry/35 hover:bg-berry/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "데모 결제 승인 중" : "데모 검수용 프리미엄 바로 보기"}
      </button>
      <p className="rounded-2xl border border-berry/10 bg-white/65 px-4 py-3 text-xs font-semibold leading-5 text-ink/55">
        데모 모드에서만 보이는 버튼입니다. 클릭하면 실제 결제 연결 없이
        premium_report 테스트 결제를 승인한 뒤 심층 리포트를 엽니다.
      </p>
      {error ? (
        <p className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      ) : null}
    </div>
  );
}
