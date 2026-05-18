"use client";

import { useEffect, useState } from "react";
import { PetMascot } from "@/components/mascot/PetMascot";

type PremiumTableOfContentsProps = {
  species?: "dog" | "cat";
  sections: Array<{
    id: string;
    title: string;
  }>;
};

export function PremiumTableOfContents({
  species = "dog",
  sections,
}: PremiumTableOfContentsProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="mt-5" aria-label="프리미엄 리포트 목차">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black uppercase text-persimmon">
          심층 리포트 목차
        </p>
        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-persimmon/10">
          <PetMascot
            species={species}
            mood="reading"
            size="sm"
            label="목차를 읽는 고양이 캐릭터"
            className="scale-75"
          />
        </div>
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-3">
        {sections.map((section, index) => {
          const isActive = activeId === section.id;

          return (
            <li key={section.id} className="min-w-0">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`focus-ring group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-berry/35 bg-white shadow-sm"
                    : "border-berry/10 bg-cream/70 hover:border-berry/35 hover:bg-white"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black shadow-sm transition ${
                    isActive
                      ? "bg-berry text-white"
                      : "bg-white text-berry group-hover:bg-berry group-hover:text-white"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`min-w-0 flex-1 whitespace-normal break-keep text-sm font-black leading-5 ${
                    isActive
                      ? "text-berry"
                      : "text-ink/75 group-hover:text-berry"
                  }`}
                >
                  {section.title}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
