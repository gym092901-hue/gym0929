import type { PetSpecies } from "@/types/reading";

type ReportHookCardProps = {
  species: PetSpecies;
  name: string;
  keyword: string;
  description?: string;
};

export function ReportHookCard({
  species,
  name,
  keyword,
  description,
}: ReportHookCardProps) {
  const animalLabel = species === "cat" ? "고양이" : "강아지";

  return (
    <section className="rounded-[2rem] border border-berry/10 bg-white/82 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-persimmon">
        첫 문장 훅
      </p>
      <h2 className="mt-3 break-keep text-2xl font-black leading-tight text-ink sm:text-4xl">
        우리 {animalLabel}는{" "}
        <span className="relative inline-block text-berry">
          {keyword}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-[#FFE5EF]"
          />
        </span>
        야
      </h2>
      {description ? (
        <p className="mt-4 break-keep text-base font-semibold leading-8 text-ink/70">
          {name}의 리포트는 이 한 문장에서 시작해요. {description}
        </p>
      ) : null}
    </section>
  );
}
