import Link from "next/link";

const navItems = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보" },
  { href: "/refund", label: "환불정책" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-berry/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="focus-ring rounded-full text-lg font-black text-ink">
          멍냥사주
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-semibold text-ink/70 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-full transition hover:text-berry"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
