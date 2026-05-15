import type { ReadingSection } from "@/types/reading";
import { postposition } from "@/lib/korean/postposition";

type FreeReadingExplorerProps = {
  petName: string;
  sections: ReadingSection[];
};

function cleanFreeBody(body: string) {
  return body
    .replace(/^\s*\d+\.\s*[^\n]+\n?/, "")
    .replace(/\n\s*\d+\.\s*[^\n]+\n?/g, "\n")
    .trim();
}

export function FreeReadingExplorer({
  petName,
  sections,
}: FreeReadingExplorerProps) {
  const cards = sections.slice(0, 5);

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
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${
                index === 0
                  ? "bg-berry/10 text-berry"
                  : "bg-persimmon/10 text-persimmon"
              }`}
            >
              {section.icon}
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
