import Link from "next/link";

type MobileStickyCTAProps = {
  href: string;
  label: string;
  subLabel?: string;
};

export function MobileStickyCTA({ href, label, subLabel }: MobileStickyCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-berry/10 bg-cream/95 px-4 py-3 shadow-[0_-12px_40px_rgba(62,44,38,0.12)] backdrop-blur sm:hidden">
      <Link
        href={href}
        className="focus-ring mx-auto flex min-h-14 max-w-md items-center justify-center rounded-full bg-[#E85D8B] px-5 py-3 text-center text-sm font-black text-white shadow-soft transition hover:bg-berry"
      >
        {label}
        <span aria-hidden="true" className="ml-2">
          →
        </span>
      </Link>
      {subLabel ? (
        <p className="mt-2 text-center text-[11px] font-bold text-ink/50">
          {subLabel}
        </p>
      ) : null}
    </div>
  );
}
