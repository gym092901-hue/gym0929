import type { ReadingSection } from "@/types/reading";
import { PetMascot } from "@/components/mascot/PetMascot";
import { postposition } from "@/lib/korean/postposition";
import type { MascotMood } from "@/components/mascot/types";
import type { PetSpecies } from "@/types/reading";

type FreeReadingExplorerProps = {
  petName: string;
  species: PetSpecies;
  sections: ReadingSection[];
};

function cleanFreeBody(body: string) {
  return body
    .replace(/^\s*\d+\.\s*[^\n]+\n?/, "")
    .replace(/\n\s*\d+\.\s*[^\n]+\n?/g, "\n")
    .trim();
}

const sectionMascot: Record<
  string,
  { mood: MascotMood; label: string; accent?: "star" | "heart" | "bag" | "book" }
> = {
  "basic-energy": {
    mood: "star",
    label: "별 카드를 보는 캐릭터",
    accent: "star",
  },
  "guardian-bond": {
    mood: "happy",
    label: "하트 쿠션을 안은 캐릭터",
    accent: "heart",
  },
  routine: {
    mood: "holding-card",
    label: "생활 루틴 카드를 든 캐릭터",
    accent: "bag",
  },
  "premium-preview": {
    mood: "reading",
    label: "리포트 책을 펼친 캐릭터",
    accent: "book",
  },
};

function MascotAccent({ accent }: { accent?: "star" | "heart" | "bag" | "book" }) {
  if (!accent) {
    return null;
  }

  if (accent === "heart") {
    return (
      <span
        aria-hidden
        className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-berry shadow-sm"
      >
        <span className="relative h-3.5 w-3.5 rotate-45 rounded-sm bg-white before:absolute before:-left-1.5 before:top-0 before:h-3.5 before:w-3.5 before:rounded-full before:bg-white after:absolute after:left-0 after:-top-1.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-white" />
      </span>
    );
  }

  if (accent === "bag") {
    return (
      <span
        aria-hidden
        className="absolute -right-1 -top-1 h-7 w-8 rounded-xl border-2 border-white bg-moss shadow-sm before:absolute before:left-2 before:top-[-0.35rem] before:h-3 before:w-4 before:rounded-t-full before:border-2 before:border-b-0 before:border-white"
      />
    );
  }

  if (accent === "book") {
    return (
      <span
        aria-hidden
        className="absolute -right-1 -top-1 grid h-7 w-8 place-items-center rounded-xl border-2 border-white bg-persimmon shadow-sm"
      >
        <span className="flex h-4 w-5 gap-0.5">
          <span className="h-full flex-1 rounded-l-sm bg-white/90" />
          <span className="h-full flex-1 rounded-r-sm bg-white/70" />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-persimmon shadow-sm"
    >
      <span className="relative h-4 w-4">
        <span className="absolute left-[0.4rem] top-0 h-4 w-1 rounded-full bg-white/90" />
        <span className="absolute left-0 top-[0.4rem] h-1 w-4 rounded-full bg-white/90" />
      </span>
    </span>
  );
}

export function FreeReadingExplorer({
  petName,
  species,
  sections,
}: FreeReadingExplorerProps) {
  const cards = sections.slice(0, 5);
  const speciesLabel = species === "dog" ? "강아지" : "고양이";

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {cards.map((section, index) => {
        const title =
          section.id === "one-line"
            ? `${postposition.possessive(petName)} 한 줄 성향`
            : section.title;

        return (
        <article
          key={section.id}
          className={`rounded-[2rem] border bg-white/75 p-5 shadow-soft ${
            index === 0
              ? "border-berry/20 sm:col-span-2"
              : "border-berry/10"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl ${
                index === 0 ? "bg-berry/10" : "bg-persimmon/10"
              }`}
            >
              {sectionMascot[section.id] ? (
                <span className="relative grid h-full w-full place-items-center">
                  <PetMascot
                    type={species}
                    mood={sectionMascot[section.id].mood}
                    size="sm"
                    label={`${sectionMascot[section.id].label} ${speciesLabel} 픽셀 캐릭터`}
                    className="scale-75"
                  />
                  <MascotAccent accent={sectionMascot[section.id].accent} />
                </span>
              ) : (
                <span className="text-xl text-persimmon">{section.icon}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black text-persimmon">
                {section.kicker}
              </p>
              <h3 className="mt-1 break-keep text-xl font-black leading-tight text-ink">
                {title}
              </h3>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-base leading-8 text-ink/75">
            {cleanFreeBody(section.body)}
          </p>
        </article>
        );
      })}
    </section>
  );
}
