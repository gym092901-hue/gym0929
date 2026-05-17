"use client";

import { useState } from "react";

type ReportFloatingActionsProps = {
  saveHref?: string;
  saveLabel?: string;
};

export function ReportFloatingActions({
  saveHref,
  saveLabel = "저장",
}: ReportFloatingActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-40 grid gap-2 sm:hidden"
      data-testid="report-floating-actions"
    >
      <button
        type="button"
        onClick={copyCurrentUrl}
        className="focus-ring grid h-12 w-12 place-items-center rounded-full bg-white/95 text-sm font-black text-berry shadow-soft"
        aria-label="현재 리포트 링크 복사"
      >
        <span aria-hidden="true">{copied ? "✓" : "↗"}</span>
      </button>
      {saveHref ? (
        <a
          href={saveHref}
          className="focus-ring grid h-12 w-12 place-items-center rounded-full bg-moss text-xs font-black text-white shadow-soft"
          aria-label={saveLabel}
        >
          <span aria-hidden="true">↓</span>
        </a>
      ) : null}
    </div>
  );
}
