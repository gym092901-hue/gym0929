"use client";

import { useState } from "react";

type PdfDownloadButtonProps = {
  readingId: string;
  petName: string;
  label?: string;
  loadingLabel?: string;
  tone?: "berry" | "light";
};

function fallbackFilename(petName: string) {
  const safeName = petName.replace(/[\\/:*?"<>|]/g, "").trim() || "반려동물";

  return `${safeName}_사주리포트.pdf`;
}

function filenameFromDisposition(disposition: string | null, petName: string) {
  if (!disposition) {
    return fallbackFilename(petName);
  }

  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return fallbackFilename(petName);
    }
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/);

  return plainMatch?.[1] ?? fallbackFilename(petName);
}

const toneClass = {
  berry: "bg-berry text-white shadow-soft hover:bg-berry/90 disabled:bg-ink/30",
  light:
    "border border-moss/25 bg-white/85 text-moss hover:bg-white disabled:bg-white/50 disabled:text-ink/35",
};

export function PdfDownloadButton({
  readingId,
  petName,
  label = "PDF로 저장하기",
  loadingLabel = "PDF 준비 중",
  tone = "berry",
}: PdfDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function downloadPdf() {
    setMessage("");
    setIsError(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/pdf/${readingId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(
          result?.error ??
            "PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error(
          "PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        );
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        petName,
      );
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage("PDF 저장을 시작했어요.");
    } catch (downloadError) {
      setIsError(true);
      setMessage(
        downloadError instanceof Error
          ? downloadError.message
          : "PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={isLoading}
        className={`focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-black transition disabled:cursor-not-allowed ${toneClass[tone]}`}
      >
        {isLoading ? loadingLabel : label}
      </button>
      {message ? (
        <p
          className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
            isError
              ? "border-berry/20 bg-berry/10 text-berry"
              : "border-moss/20 bg-moss/10 text-moss"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
