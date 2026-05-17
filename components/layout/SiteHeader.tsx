import Link from "next/link";
import { PetMascot } from "@/components/mascot/PetMascot";

const navItems = [
  { href: "/test", label: "테스트 안내" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보" },
  { href: "/refund", label: "환불정책" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-berry/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 rounded-full text-lg font-black text-ink"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 shadow-sm">
            <PetMascot type="both" mood="happy" size="sm" />
          </span>
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
