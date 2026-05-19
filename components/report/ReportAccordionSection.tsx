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
}: ReportAccordionSectionProps) {
  return (
    <article id={id} className="warm-panel scroll-mt-32 rounded-[2rem] p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFE5EF] text-sm font-black text-berry">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-black uppercase tracking-[0.16em] text-persimmon">
            심층 해석
          </span>
          <h2 className="mt-1 break-keep text-2xl font-black leading-tight text-ink">
            {title}
          </h2>
          <p className="mt-3 break-keep rounded-[1.25rem] bg-berry/5 px-4 py-3 text-sm font-bold leading-6 text-ink/68">
            {summary}
          </p>
        </div>
      </div>
      <div className="mt-5 border-t border-berry/10 pt-5">{children}</div>
    </article>
  );
}
