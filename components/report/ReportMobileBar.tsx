import Link from "next/link";

type ReportMobileBarProps = {
  title: string;
  backHref?: string;
  rightLabel?: string;
  rightHref?: string;
  rightTone?: "free" | "paid" | "neutral";
};

export function ReportMobileBar({
  title,
  backHref = "/",
  rightLabel,
  rightHref,
  rightTone = "neutral",
}: ReportMobileBarProps) {
  const toneClass = {
    free: "bg-moss/10 text-moss ring-1 ring-moss/15",
    paid: "bg-berry/10 text-berry ring-1 ring-berry/15",
    neutral: "bg-white/85 text-moss shadow-sm",
  }[rightTone];

  return (
    <div className="sticky top-[65px] z-30 -mx-4 mb-5 border-y border-berry/10 bg-cream/95 px-4 py-2 backdrop-blur sm:hidden">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-3">
        <Link
          href={backHref}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/85 text-lg font-black text-berry shadow-sm"
          aria-label="이전 화면으로 이동"
        >
          <span aria-hidden>‹</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-black text-ink">
          {title}
        </p>
        {rightLabel ? (
          rightHref ? (
            <Link
              href={rightHref}
              className={`focus-ring inline-flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-xs font-black ${toneClass}`}
            >
              {rightLabel}
            </Link>
          ) : (
            <span
              className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-xs font-black ${toneClass}`}
            >
              {rightLabel}
            </span>
          )
        ) : (
          <span className="h-10 w-10 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}
