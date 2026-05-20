import { PetMascot } from "@/components/mascot/PetMascot";
import { PetHookCard } from "@/components/report/PetHookCard";
import { PetInputSummaryTags } from "@/components/report/PetInputSummaryTags";
import { ReportTable } from "@/components/report/ReportTable";
import { TabInsightCard } from "@/components/report/TabInsightCard";
import { createTabInsights } from "@/lib/report/tabInsightGenerator";
import type {
  FiveElement,
  FiveElementScore,
} from "@/lib/saju/petSajuEngine";
import type { PetLifestyleProfile, PetSpecies } from "@/types/reading";

type PremiumReportTabsProps = {
  readingId: string;
  petName: string;
  species: PetSpecies;
  birthDate?: string | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  adoptionDate?: string | null;
  guardianEmail?: string | null;
  generatedAt: string;
  hook: {
    hookSentence: string;
    hookKeyword: string;
    hookSubcopy: string;
    highlightWords: string[];
  };
  primaryElement: FiveElement;
  secondaryElement: FiveElement;
  scores: FiveElementScore;
  summaryKeywords: string[];
  lifestyle: PetLifestyleProfile;
  sections: Array<{
    id: string;
    title: string;
    body: string;
  }>;
};

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

function speciesLabel(species: PetSpecies) {
  return species === "dog" ? "강아지" : "고양이";
}

function basisLabel({
  birthDate,
  adoptionDate,
}: {
  birthDate?: string | null;
  adoptionDate?: string | null;
}) {
  if (birthDate) return `생년월일 ${birthDate}`;
  if (adoptionDate) return `처음 만난 날 ${adoptionDate}`;

  return "입력한 기본 정보";
}

function createReadingRows(
  sections: PremiumReportTabsProps["sections"],
): string[][] {
  return sections.map((section, index) => [
    String(index + 1).padStart(2, "0"),
    section.title,
    index === 0
      ? "먼저 전체 성향을 잡고 천천히 읽어보세요."
      : index < 4
        ? "보호자와의 교감에 바로 연결되는 부분이에요."
        : "생활 속에서 실천할 수 있는 힌트까지 이어집니다.",
  ]);
}

export function PremiumReportTabs({
  petName,
  species,
  birthDate,
  birthTime,
  birthTimeUnknown,
  adoptionDate,
  generatedAt,
  hook,
  primaryElement,
  secondaryElement,
  summaryKeywords,
  lifestyle,
  sections,
}: PremiumReportTabsProps) {
  const coreIntro =
    `${petName}의 핵심 성향, 오행 흐름, 보호자와의 교감, 생활 루틴, ` +
    "올해의 흐름과 종합 보고서를 한 화면에 차례대로 정리했어요.";
  const tabInsights = createTabInsights({
    petName,
    species,
    dominantElement: primaryElement,
    secondaryElement,
    lifestyle,
    birthDate,
    adoptionDate,
  });

  return (
    <section
      className="rounded-[2rem] border border-berry/10 bg-white/78 p-5 shadow-soft sm:p-7"
      data-testid="premium-report-tabs"
      data-report-mode="continuous"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-sm font-black text-persimmon">
            순서대로 읽는 심층 리포트
          </p>
          <h2 className="mt-2 break-keep text-3xl font-black leading-tight text-ink">
            탭을 누르지 않아도 처음부터 끝까지 이어서 볼 수 있어요
          </h2>
          <p className="mt-3 break-keep text-sm font-semibold leading-7 text-ink/65">
            {coreIntro}
          </p>
        </div>
        <PetMascot
          species={species}
          mood="reading"
          size="md"
          decorative
          className="justify-self-start lg:justify-self-end"
        />
      </div>

      <div className="mt-5">
        <PetHookCard
          species={species}
          hookSentence={hook.hookSentence}
          hookKeyword={hook.hookKeyword}
          hookSubcopy={hook.hookSubcopy}
          highlightWords={hook.highlightWords}
          mascot={
            <PetMascot
              species={species}
              mood="holding-card"
              size="md"
              decorative
            />
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-[1.5rem] border border-berry/10 bg-berry/10 p-4">
          <p className="text-xs font-black text-berry">종</p>
          <p className="mt-2 text-lg font-black text-ink">
            {speciesLabel(species)}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-moss/15 bg-moss/10 p-4">
          <p className="text-xs font-black text-moss">대표 기운</p>
          <p className="mt-2 text-lg font-black text-ink">
            {elementLabels[primaryElement]}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-persimmon/15 bg-persimmon/10 p-4">
          <p className="text-xs font-black text-persimmon">분석 기준</p>
          <p className="mt-2 break-keep text-sm font-black leading-6 text-ink">
            {basisLabel({ birthDate, adoptionDate })}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-berry/10 bg-white/75 p-4">
          <p className="text-xs font-black text-berry">작성일</p>
          <p className="mt-2 text-sm font-black text-ink">{generatedAt}</p>
        </article>
      </div>

      <div className="mt-5">
        <PetInputSummaryTags
          petName={petName}
          species={species}
          birthDate={birthDate}
          birthTime={birthTime}
          birthTimeUnknown={birthTimeUnknown}
          adoptionDate={adoptionDate}
          livingEnvironment={lifestyle.livingEnvironment}
          activityLevel={lifestyle.dailyActivityFrequency}
          aloneTime={lifestyle.aloneTime}
          strangerReaction={lifestyle.strangerReaction}
          guardianDistance={lifestyle.guardianDistance}
          favoriteActivities={lifestyle.favoriteActivities}
        />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-berry/10 bg-cream/70 p-4">
        <p className="text-sm font-black text-berry">성향 키워드</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summaryKeywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-white/85 px-3 py-1 text-sm font-black text-berry"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <ReportTable
          caption={`${petName} 심층 리포트 읽는 순서`}
          columns={["순서", "리포트 항목", "읽는 포인트"]}
          rows={createReadingRows(sections)}
        />
      </div>

      <div className="mt-5">
        <TabInsightCard species={species} insight={tabInsights.overview} />
      </div>
    </section>
  );
}
