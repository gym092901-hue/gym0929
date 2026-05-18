"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PetMascot } from "@/components/mascot/PetMascot";
import { PetElementBalance } from "@/components/report/PetElementBalance";
import { PetHookCard } from "@/components/report/PetHookCard";
import { PetInputSummaryTags } from "@/components/report/PetInputSummaryTags";
import { PremiumA4Report } from "@/components/report/PremiumA4Report";
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

type TabId =
  | "overview"
  | "elements"
  | "attachment"
  | "routine"
  | "yearly"
  | "guardian"
  | "input"
  | "report";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "한눈에 보기" },
  { id: "elements", label: "오행 성향" },
  { id: "attachment", label: "애착 분석" },
  { id: "routine", label: "생활 루틴" },
  { id: "yearly", label: "올해의 흐름" },
  { id: "guardian", label: "보호자 가이드" },
  { id: "input", label: "입력 정보 확인" },
  { id: "report", label: "종합 리포트" },
];

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const elementCopy: Record<FiveElement, string> = {
  wood: "호기심, 성장, 탐색의 기운이 생활 속에서 드러나요.",
  fire: "표현력, 애교, 활발함이 보호자와의 반응 속에서 살아나요.",
  earth: "안정감, 루틴, 신뢰가 익숙한 순서 안에서 쌓여요.",
  metal: "규칙, 예민함, 경계가 낯선 자극을 확인하는 태도로 보여요.",
  water: "관찰, 신중함, 감정 흡수가 조용한 반응으로 나타나요.",
};

function hashToTab(hash: string): TabId {
  const value = hash.replace("#", "");
  const found = tabs.find((tab) => tab.id === value);

  if (found) {
    return found.id;
  }

  if (value.startsWith("premium-section")) {
    return "report";
  }

  return "overview";
}

function lifestyleText(species: PetSpecies, lifestyle: PetLifestyleProfile) {
  if (species === "cat") {
    return {
      attachment:
        "손길보다 거리감 조절이 먼저인 아이로 보고, 먼저 다가올 때까지 기다려주는 태도가 잘 맞아요.",
      alone:
        "혼자 있는 시간이 길 때는 창가, 캣타워, 숨숨집처럼 선택할 수 있는 자리를 열어두면 편안한 리듬을 만들 수 있어요.",
      routine:
        "짧은 사냥놀이 뒤에는 자기 자리로 돌아갈 시간을 주면 활동과 휴식의 경계가 자연스럽게 잡힙니다.",
      play:
        lifestyle.favoriteActivities.includes("window_watch")
          ? "창밖 관찰 시간을 방해하지 않고 보호자가 같은 방에 조용히 머무르는 방식이 좋아요."
          : "장난감은 길게 끌기보다 짧게 몰입하고 스스로 멈출 수 있게 해 주세요.",
    };
  }

  return {
    attachment:
      "같은 말투와 같은 순서의 칭찬이 안정적인 약속처럼 쌓일 수 있어요.",
    alone:
      "혼자 있는 시간이 길 때는 귀가 후 반복 인사와 짧은 놀이를 붙여 안정감을 줄 수 있어요.",
    routine:
      "산책이나 노즈워크 뒤에 물 마시기와 조용한 휴식을 이어주면 하루의 리듬이 더 편안해집니다.",
    play:
      lifestyle.favoriteActivities.includes("treat_search")
        ? "간식 찾기처럼 짧게 집중하고 성공감을 느끼는 놀이가 잘 맞아요."
        : "냄새 맡기와 보호자 반응을 충분히 주는 놀이가 잘 맞아요.",
  };
}

function monthlyPreview(species: PetSpecies) {
  return species === "cat"
    ? [
        ["초봄", "탐색", "새 장난감은 짧게 보여주고 스스로 다가오게 해 주세요."],
        ["여름", "휴식", "시원한 자기 자리와 숨숨집을 편하게 열어 주세요."],
        ["가을", "리듬", "캣타워와 창가 관찰 시간을 일정하게 유지해 주세요."],
      ]
    : [
        ["초봄", "탐색", "새로운 냄새와 산책길을 천천히 경험해 주세요."],
        ["여름", "휴식", "실내 노즈워크 뒤 조용히 쉬는 순서를 만들어 주세요."],
        ["가을", "리듬", "산책과 귀가 후 휴식의 순서를 다시 맞춰 주세요."],
      ];
}

export function PremiumReportTabs({
  readingId,
  petName,
  species,
  birthDate,
  birthTime,
  birthTimeUnknown,
  adoptionDate,
  guardianEmail,
  generatedAt,
  hook,
  primaryElement,
  secondaryElement,
  scores,
  summaryKeywords,
  lifestyle,
  sections,
}: PremiumReportTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const strongestElement = elementLabels[primaryElement];
  const secondaryElementLabel = elementLabels[secondaryElement];
  const tabInsights = useMemo(
    () =>
      createTabInsights({
        petName,
        species,
        dominantElement: primaryElement,
        secondaryElement,
        lifestyle,
        birthDate,
        adoptionDate,
      }),
    [
      adoptionDate,
      birthDate,
      lifestyle,
      petName,
      primaryElement,
      secondaryElement,
      species,
    ],
  );
  const lifestyleCopy = lifestyleText(species, lifestyle);

  useEffect(() => {
    setActiveTab(hashToTab(window.location.hash));

    function handleHashChange() {
      setActiveTab(hashToTab(window.location.hash));
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
  }

  return (
    <section
      className="rounded-[2rem] border border-berry/10 bg-white/72 p-4 shadow-soft sm:p-6"
      data-testid="premium-report-tabs"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-persimmon">탭형 심층 리포트</p>
          <h2 className="mt-1 break-keep text-2xl font-black text-ink">
            보고 싶은 항목을 골라 차분히 읽어보세요
          </h2>
        </div>
        <PetMascot species={species} mood="reading" size="sm" decorative />
      </div>

      <div
        className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0"
        role="tablist"
        aria-label="프리미엄 리포트 탭"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`premium-tab-panel-${tab.id}`}
              id={`premium-tab-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              className={`focus-ring min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-black transition lg:w-full ${
                isActive
                  ? "border-berry bg-berry text-white shadow-soft"
                  : "border-berry/10 bg-cream/80 text-ink/65 hover:border-berry/30 hover:bg-white"
              }`}
              data-tab-id={tab.id}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === "overview" ? (
          <div
            id="premium-tab-panel-overview"
            role="tabpanel"
            aria-labelledby="premium-tab-overview"
            className="grid gap-5"
          >
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

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-[1.5rem] border border-berry/10 bg-berry/10 p-4">
                <p className="text-xs font-black text-berry">대표 기운</p>
                <p className="mt-2 text-3xl font-black text-berry">
                  {strongestElement}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-ink/65">
                  {elementCopy[primaryElement]}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-moss/15 bg-moss/10 p-4">
                <p className="text-xs font-black text-moss">성향 키워드</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {summaryKeywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-white/85 px-3 py-1 text-sm font-black text-moss"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </article>
              <article className="rounded-[1.5rem] border border-persimmon/15 bg-persimmon/10 p-4 sm:col-span-2">
                <p className="text-xs font-black text-persimmon">
                  오늘의 교감 루틴
                </p>
                <p className="mt-2 break-keep text-base font-bold leading-7 text-ink/72">
                  {lifestyleCopy.routine}
                </p>
              </article>
            </div>
            <TabInsightCard species={species} insight={tabInsights.overview} />
          </div>
        ) : null}

        {activeTab === "elements" ? (
          <div
            id="premium-tab-panel-elements"
            role="tabpanel"
            aria-labelledby="premium-tab-elements"
            className="grid gap-5"
          >
            <PetElementBalance petName={petName} species={species} scores={scores} />
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4">
                <p className="text-sm font-black text-berry">가장 또렷한 기운</p>
                <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                  {strongestElement} 기운은 {elementCopy[primaryElement]}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-moss/15 bg-white/78 p-4">
                <p className="text-sm font-black text-moss">
                  천천히 채워주면 좋은 리듬
                </p>
                <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                  {secondaryElementLabel} 기운은 평가가 아니라 생활 힌트예요. 작은 루틴을
                  반복하면서 천천히 넓혀보면 좋습니다.
                </p>
              </article>
            </div>
            <TabInsightCard species={species} insight={tabInsights.elements} />
          </div>
        ) : null}

        {activeTab === "attachment" ? (
          <div
            id="premium-tab-panel-attachment"
            role="tabpanel"
            aria-labelledby="premium-tab-attachment"
            className="grid gap-4"
          >
            {[
              ["보호자와의 거리감", lifestyleCopy.attachment],
              ["혼자 있는 시간 루틴", lifestyleCopy.alone],
              ["사랑을 확인하는 방식", hook.hookKeyword],
              [
                "보호자가 해주면 좋은 말과 행동",
                species === "dog"
                  ? "같은 말투로 이름을 불러주고, 반응이 작아도 기다려 주세요."
                  : "먼저 다가올 때까지 기다리고, 느린 눈맞춤처럼 작은 신호를 알아봐 주세요.",
              ],
            ].map(([title, body]) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4"
              >
                <p className="text-sm font-black text-berry">{title}</p>
                <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                  {body}
                </p>
              </article>
            ))}
            <TabInsightCard species={species} insight={tabInsights.attachment} />
          </div>
        ) : null}

        {activeTab === "routine" ? (
          <div
            id="premium-tab-panel-routine"
            role="tabpanel"
            aria-labelledby="premium-tab-routine"
            className="grid gap-4 sm:grid-cols-2"
          >
            {[
              [
                "아침 루틴",
                species === "dog"
                  ? "이름을 부르며 짧게 인사하고 하루의 첫 반응을 기다려 주세요."
                  : "창가 관찰이나 자기 자리에서 하루를 시작할 수 있게 해 주세요.",
              ],
              [
                species === "dog" ? "산책/놀이 루틴" : "놀이 루틴",
                lifestyleCopy.play,
              ],
              ["혼자 있는 시간 루틴", lifestyleCopy.alone],
              [
                "잠들기 전 루틴",
                species === "dog"
                  ? "같은 문장으로 칭찬하고 조용한 자리에서 마무리해 주세요."
                  : "화장실 동선과 잠자리를 정리하고 손길보다 조용한 분위기를 먼저 주세요.",
              ],
            ].map(([title, body]) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4"
              >
                <p className="text-sm font-black text-persimmon">{title}</p>
                <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                  {body}
                </p>
              </article>
            ))}
            <div className="sm:col-span-2">
              <TabInsightCard species={species} insight={tabInsights.routine} />
            </div>
          </div>
        ) : null}

        {activeTab === "yearly" ? (
          <div
            id="premium-tab-panel-yearly"
            role="tabpanel"
            aria-labelledby="premium-tab-yearly"
            className="grid gap-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["올해의 키워드", `${hook.hookKeyword}의 속도를 존중하는 해`],
                [
                  "관계 흐름",
                  "보호자와 맞는 루틴을 조금씩 다듬어 안정감을 쌓기 좋은 흐름이에요.",
                ],
                [
                  "활동 흐름",
                  species === "dog"
                    ? "새 산책길이나 노즈워크는 짧게 시도하고 익숙한 마무리를 붙여 주세요."
                    : "새 장난감이나 창가 자리 변화는 짧게 보여주고 스스로 선택하게 해 주세요.",
                ],
                [
                  "안정 포인트",
                  "예언이 아니라 생활 체크리스트처럼 작은 반복과 차분한 마무리를 중심에 두면 좋아요.",
                ],
              ].map(([title, body]) => (
                <article
                  key={title}
                  className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4"
                >
                  <p className="text-sm font-black text-berry">{title}</p>
                  <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                    {body}
                  </p>
                </article>
              ))}
            </div>
            <ReportTable
              caption={`${petName} 월별 조언 미리보기`}
              columns={["시기", "키워드", "생활 힌트"]}
              rows={monthlyPreview(species)}
            />
            <TabInsightCard species={species} insight={tabInsights.yearly} />
          </div>
        ) : null}

        {activeTab === "guardian" ? (
          <div
            id="premium-tab-panel-guardian"
            role="tabpanel"
            aria-labelledby="premium-tab-guardian"
            className="grid gap-4 sm:grid-cols-2"
          >
            {[
              ["좋아할 칭찬 문장", `${petName}, 천천히 해도 괜찮아. 잘 보고 있어.`],
              [
                "피하면 좋은 소통 방식",
                "갑자기 다가가거나 반응을 재촉하기보다 스스로 선택할 시간을 주세요.",
              ],
              [
                "잘 맞는 놀이",
                species === "dog"
                  ? "간식 찾기, 짧은 노즈워크, 냄새 맡기 산책"
                  : "짧은 사냥놀이, 창밖 관찰, 캣타워 동선 놀이",
              ],
              [
                "기억하면 좋은 한 문장",
                species === "dog"
                  ? "반응이 작아도 기다려주면 마음을 더 편하게 열 수 있어요."
                  : "손길보다 거리와 시간을 먼저 맞춰주면 신뢰가 더 오래 남아요.",
              ],
            ].map(([title, body]) => (
              <article
                key={title}
                className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4"
              >
                <p className="text-sm font-black text-moss">{title}</p>
                <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                  {body}
                </p>
              </article>
            ))}
            <div className="sm:col-span-2">
              <TabInsightCard species={species} insight={tabInsights.guardian} />
            </div>
          </div>
        ) : null}

        {activeTab === "input" ? (
          <div
            id="premium-tab-panel-input"
            role="tabpanel"
            aria-labelledby="premium-tab-input"
            className="grid gap-4"
          >
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
            <div className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4">
              <p className="text-sm font-black text-persimmon">분석 기준</p>
              <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                {birthDate
                  ? "생년월일을 기준으로 보고, 처음 만난 날과 생활 리듬은 보조 정보로 참고했어요."
                  : "생일을 모르는 경우 처음 만난 날을 하나의 소중한 기준으로 읽었어요."}
                태어난 시간은 {birthTime ? `${birthTime} 입력됨` : "모름"}으로 반영했습니다.
              </p>
            </div>
            <Link
              href="/input"
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-berry px-6 py-3 text-sm font-black text-white shadow-soft transition hover:bg-berry/90"
            >
              다시 입력하기
            </Link>
            <TabInsightCard species={species} insight={tabInsights.input} />
          </div>
        ) : null}

        {activeTab === "report" ? (
          <div
            id="premium-tab-panel-report"
            role="tabpanel"
            aria-labelledby="premium-tab-report"
            className="grid gap-5"
          >
            <PremiumA4Report
              readingId={readingId}
              petName={petName}
              species={species}
              birthDate={birthDate}
              birthTime={birthTime}
              birthTimeUnknown={birthTimeUnknown}
              adoptionDate={adoptionDate}
              guardianEmail={guardianEmail}
              generatedAt={generatedAt}
              hookKeyword={hook.hookKeyword}
              primaryElement={primaryElement}
              scores={scores}
              summaryKeywords={summaryKeywords}
              sections={sections}
            />
            <TabInsightCard species={species} insight={tabInsights.report} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
