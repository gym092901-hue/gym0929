import Link from "next/link";
import type { ReactNode } from "react";

type PrimaryLinkProps = {
  href: string;
  children: ReactNode;
  tone?: "berry" | "moss" | "light";
  className?: string;
};

const toneClass = {
  berry: "bg-berry text-white shadow-soft hover:bg-berry/90",
  moss: "bg-moss text-white shadow-soft hover:bg-moss/90",
  light: "border border-berry/20 bg-white/80 text-berry hover:bg-white",
};

export function PrimaryLink({
  href,
  children,
  tone = "berry",
  className = "",
}: PrimaryLinkProps) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-center text-sm font-bold transition ${toneClass[tone]} ${className}`}
    >
      {children}
    </Link>
  );
}
