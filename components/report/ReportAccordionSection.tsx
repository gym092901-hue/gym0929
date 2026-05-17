import type { ReactNode } from "react";

type ReportAccordionSectionProps = {
  id: string;
  index: number;
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function ReportAccordionSection({
  id,
  index,
  title,
  summary,
  children,
  defaultOpen = false,
}: ReportAccordionSectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group warm-panel scroll-mt-32 rounded-[2rem] p-0"
    >
      <summary className="focus-ring cursor-pointer list-none rounded-[2rem] p-5 sm:p-7 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFE5EF] text-sm font-black text-berry">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-[0.16em] text-persimmon">
              심층 해석
            </span>
            <span className="mt-1 block break-keep text-2xl font-black leading-tight text-ink">
              {title}
            </span>
            <span className="mt-3 block break-keep rounded-[1.25rem] bg-berry/5 px-4 py-3 text-sm font-bold leading-6 text-ink/68">
              {summary}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-berry shadow-sm transition group-open:rotate-180"
          >
            ˅
          </span>
        </div>
      </summary>
      <div className="border-t border-berry/10 px-5 pb-6 pt-1 sm:px-7 sm:pb-7">
        {children}
      </div>
    </details>
  );
}
