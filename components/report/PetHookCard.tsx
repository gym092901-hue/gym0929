import type { ReactNode } from "react";
import type { PetSpecies } from "@/types/reading";

type PetHookCardProps = {
  species: PetSpecies;
  hookSentence: string;
  hookKeyword: string;
  hookSubcopy: string;
  highlightWords: string[];
  size?: "normal" | "large";
  mascot?: ReactNode;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedSentence(sentence: string, highlightWords: string[]) {
  const words = highlightWords
    .map((word) => word.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (words.length === 0) {
    return sentence;
  }

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "g");

  return sentence.split(pattern).map((part, index) => {
    if (words.includes(part)) {
      return (
        <span key={`${part}-${index}`} className="report-highlight text-berry">
          {part}
        </span>
      );
    }

    return part;
  });
}

export function PetHookCard({
  species,
  hookSentence,
  hookKeyword,
  hookSubcopy,
  highlightWords,
  size = "normal",
  mascot,
}: PetHookCardProps) {
  const animalLabel = species === "cat" ? "고양이 훅" : "강아지 훅";
  const sentenceHighlightWords = Array.from(
    new Set([...highlightWords, `${hookKeyword}야.`, `${hookKeyword}야`]),
  );

  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-berry/10 bg-white/88 p-5 shadow-soft ${
        size === "large" ? "sm:p-7" : ""
      }`}
      data-testid="pet-hook-card"
      data-has-hook-copy="true"
      data-hook-species={species}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-persimmon">
              첫 문장 결론
            </p>
            <span className="rounded-full bg-[#FFE5EF] px-3 py-1 text-xs font-black text-berry">
              {animalLabel}
            </span>
          </div>
          <h2
            className={`mt-3 break-keep font-black leading-tight text-ink ${
              size === "large" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"
            }`}
          >
            {renderHighlightedSentence(hookSentence, sentenceHighlightWords)}
          </h2>
        </div>
        {mascot ? (
          <div
            className="justify-self-center sm:justify-self-end"
            aria-hidden="true"
          >
            {mascot}
          </div>
        ) : null}
      </div>
      <div className="mt-4 rounded-[1.35rem] bg-cream/75 px-4 py-3">
        <p className="text-xs font-black text-berry">핵심 키워드</p>
        <p className="mt-1 text-lg font-black text-ink">{hookKeyword}</p>
        <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/62">
          {hookSubcopy}
        </p>
      </div>
    </section>
  );
}
