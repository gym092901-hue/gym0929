import type { ReactNode } from "react";
import { FloatingPets } from "@/components/mascot/FloatingPets";
import type { MascotType } from "@/components/mascot/types";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  narrow?: boolean;
  mascotType?: MascotType;
};

export function PageShell({
  children,
  eyebrow,
  title,
  description,
  narrow = false,
  mascotType = "both",
}: PageShellProps) {
  return (
    <main className="relative min-h-[calc(100vh-160px)] overflow-hidden px-4 pb-28 pt-8 sm:px-6 sm:py-12">
      <FloatingPets type={mascotType} />
      <div className={`relative mx-auto ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {(eyebrow || title || description) && (
          <div className="mb-8">
            {eyebrow && (
              <p className="mb-3 text-sm font-black uppercase text-persimmon">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="max-w-full break-all text-3xl font-black leading-tight text-ink [overflow-wrap:anywhere] sm:max-w-3xl sm:break-normal sm:text-5xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70 sm:text-lg">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
