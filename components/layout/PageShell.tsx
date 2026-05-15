import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  narrow?: boolean;
};

export function PageShell({
  children,
  eyebrow,
  title,
  description,
  narrow = false,
}: PageShellProps) {
  return (
    <main className="min-h-[calc(100vh-160px)] px-4 py-8 sm:px-6 sm:py-12">
      <div className={`mx-auto ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
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
