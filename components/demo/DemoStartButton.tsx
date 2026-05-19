"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DemoSampleResponse = {
  nextUrl?: string;
  error?: string;
};

type DemoStartButtonProps = {
  directHref?: string;
};

export function DemoStartButton({ directHref }: DemoStartButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function createDemoReading() {
    setError("");
    setIsLoading(true);

    if (directHref) {
      router.push(directHref);
      return;
    }

    try {
      const response = await fetch("/api/demo/sample-reading", {
        method: "POST",
      });
      const result = (await response.json()) as DemoSampleResponse;

      if (!response.ok || !result.nextUrl) {
        throw new Error(result.error ?? "샘플 리포트를 생성하지 못했습니다.");
      }

      router.push(result.nextUrl);
    } catch (demoError) {
      setError(
        demoError instanceof Error
          ? demoError.message
          : "샘플 리포트를 생성하지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={createDemoReading}
        disabled={isLoading}
        className="focus-ring inline-flex min-h-14 w-full items-center justify-center rounded-full bg-berry px-6 py-4 text-base font-black text-white shadow-soft transition hover:bg-berry/90 disabled:cursor-not-allowed disabled:bg-ink/30 sm:w-auto"
      >
        {isLoading ? "샘플 리포트 생성 중" : "몽이 무료 데모 시작하기"}
      </button>
      {error && (
        <p className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      )}
    </div>
  );
}
