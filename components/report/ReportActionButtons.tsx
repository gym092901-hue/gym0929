"use client";

import { useState } from "react";
import Link from "next/link";
import { PdfDownloadButton } from "@/components/report/PdfDownloadButton";
import { copyReportText } from "@/lib/report/copyReportText";
import { openPrintableReport } from "@/lib/report/openPrintableReport";

type Notice = {
  tone: "success" | "error";
  message: string;
};

type ReportActionButtonsProps = {
  readingId: string;
  petName: string;
  reportText: string;
};

export function ReportActionButtons({
  readingId,
  petName,
  reportText,
}: ReportActionButtonsProps) {
  const [notice, setNotice] = useState<Notice | null>(null);

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 2400);
  }

  async function copyReport() {
    const copied = await copyReportText(reportText);

    showNotice(
      copied
        ? {
            tone: "success",
            message: "리포트 내용이 복사되었어요.",
          }
        : {
            tone: "error",
            message: "복사에 실패했어요. 다시 시도해 주세요.",
          },
    );
  }

  function printReport() {
    const opened = openPrintableReport({
      title: `${petName} 사주 심층 리포트`,
      reportText,
    });

    if (!opened) {
      showNotice({
        tone: "error",
        message: "인쇄 창을 열 수 없어요. 팝업 차단 설정을 확인해 주세요.",
      });
    }
  }

  return (
    <div className="grid gap-3" data-testid="report-action-buttons">
      <div className="grid gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={copyReport}
          className="focus-ring min-h-12 rounded-full border border-moss/25 bg-white/85 px-6 py-3 text-sm font-black text-moss transition hover:bg-white"
        >
          텍스트 복사
        </button>
        <button
          type="button"
          onClick={printReport}
          className="focus-ring min-h-12 rounded-full border border-berry/15 bg-white/85 px-6 py-3 text-sm font-black text-berry transition hover:bg-white"
        >
          인쇄하기
        </button>
        <PdfDownloadButton
          readingId={readingId}
          petName={petName}
          label="PDF로 저장하기"
          tone="berry"
        />
        <Link
          href="/input"
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-persimmon/20 bg-white/85 px-6 py-3 text-sm font-black text-persimmon transition hover:bg-white"
        >
          다시 입력하기
        </Link>
      </div>

      {notice ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm font-black leading-6 ${
            notice.tone === "success"
              ? "border-moss/20 bg-moss/10 text-moss"
              : "border-berry/20 bg-berry/10 text-berry"
          }`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
