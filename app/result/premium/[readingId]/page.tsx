import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { MobileStickyCTA } from "@/components/report/MobileStickyCTA";
import { PetElementBalance } from "@/components/report/PetElementBalance";
import { PetHookCard } from "@/components/report/PetHookCard";
import { PremiumTableOfContents } from "@/components/report/PremiumTableOfContents";
import { PdfDownloadButton } from "@/components/report/PdfDownloadButton";
import { ReportAccordionSection } from "@/components/report/ReportAccordionSection";
import { ReportFloatingActions } from "@/components/report/ReportFloatingActions";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import { ReportSceneBanner } from "@/components/report/ReportSceneBanner";
import { isDemoModeEnabled, isDemoReadingId } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { getOrCreatePremiumReading } from "@/lib/readings";
import { generatePetHook } from "@/lib/saju/petHookGenerator";
import {
  calculatePetFiveElements,
  getElementLabel,
  type FiveElement,
} from "@/lib/saju/petSajuEngine";
import { sanitizePremiumReport } from "@/lib/saju/premiumReportGenerator";

type PremiumResultPageProps = {
  params: Promise<{
    readingId: string;
  }>;
};

const elementKeywords: Record<FiveElement, string[]> = {
  wood: ["호기심", "탐색", "성장"],
  fire: ["표현력", "애교", "존재감"],
  earth: ["안정감", "루틴", "편안함"],
  metal: ["섬세함", "신중함", "규칙성"],
  water: ["관찰력", "감수성", "차분함"],
};

function getElementKeywords(element: FiveElement, species: "dog" | "cat") {
  if (species === "cat" && element === "fire") {
    return ["표현력", "눈빛 신호", "존재감"];
  }

  return elementKeywords[element];
}

function createSummaryText(body: string) {
  const cleanBody = body.replace(/\s+/g, " ").trim();
  const firstSentence =
    cleanBody.match(/[^.!?]+[.!?]/)?.[0]?.trim() ?? cleanBody;

  return firstSentence.length > 96
    ? `${firstSentence.slice(0, 95).trim()}...`
    : firstSentence;
}

function splitPremiumBody(body: string) {
  const lines = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line) => {
    if (/^\d{1,2}\.\s/.test(line)) {
      return [line.replace(/^\d{1,2}\.\s*/, "")];
    }

    const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [line];
    const chunks: string[] = [];

    for (let index = 0; index < sentences.length; index += 2) {
      chunks.push(sentences.slice(index, index + 2).join(" ").trim());
    }

    return chunks;
  });
}

function createTodayAction(
  title: string,
  petName: string,
  species: "dog" | "cat",
) {
  if (species === "cat") {
    if (title.includes("오행")) {
      return `${postposition.to(petName)} 편안했던 자기 자리, 창밖 관찰 시간, 꼬리 끝 움직임을 한 줄로 기록해보세요.`;
    }

    if (title.includes("성격") || title.includes("장점")) {
      return `${postposition.subject(petName)} 먼저 다가올 때까지 기다렸다가 느린 눈맞춤으로 답해주세요.`;
    }

    if (title.includes("예민") || title.includes("낯선")) {
      return `낯선 자극 앞에서는 손길보다 거리감을 먼저 주고, 캣타워나 숨숨집 선택지를 열어주세요.`;
    }

    if (title.includes("사랑") || title.includes("보호자")) {
      return `오늘은 같은 방에 조용히 머무르며 ${postposition.subject(petName)} 보내는 작은 신뢰 신호를 기다려보세요.`;
    }

    if (title.includes("루틴") || title.includes("놀이")) {
      return `짧은 사냥놀이 뒤에는 자기 자리로 돌아가 쉬는 흐름을 자연스럽게 이어주세요.`;
    }

    if (title.includes("올해") || title.includes("월별")) {
      return `이번 달에 좋아했던 자리, 놀이, 숨숨집 시간을 짧게 메모해보세요.`;
    }

    return `${petName}의 거리감을 서두르지 말고, 조용히 곁에 머무는 시간을 살펴봐 주세요.`;
  }

  if (title.includes("오행")) {
    return `${postposition.to(petName)} 잘 맞았던 놀이, 쉬는 자리, 산책 리듬을 한 줄로 기록해보세요.`;
  }

  if (title.includes("성격") || title.includes("장점")) {
    return `${postposition.subject(petName)} 스스로 다가오는 순간을 기다렸다가 짧게 칭찬해주세요.`;
  }

  if (title.includes("예민") || title.includes("낯선")) {
    return `낯선 자극 앞에서는 바로 다가가기보다 한 걸음 거리와 시간을 먼저 주세요.`;
  }

  if (title.includes("사랑") || title.includes("보호자")) {
    return `오늘은 ${postposition.to(petName)} 같은 톤으로 이름을 불러주고 반응을 천천히 기다려보세요.`;
  }

  if (title.includes("루틴") || title.includes("산책") || title.includes("놀이")) {
    return `밥, 놀이, 휴식을 같은 순서로 이어주는 작은 약속을 하나 만들어보세요.`;
  }

  if (title.includes("올해") || title.includes("월별")) {
    return `이번 달에 잘 맞았던 생활 리듬 하나를 메모하고 다음 달에도 이어가보세요.`;
  }

  return `${petName}의 작은 신호를 결론 내리기보다 한 번 더 바라봐 주세요.`;
}

export default async function PremiumResultPage({
  params,
}: PremiumResultPageProps) {
  const { readingId } = await params;

  if (isDemoReadingId(readingId) && !isDemoModeEnabled()) {
    notFound();
  }

  const premiumAccess = await checkPaymentAccess(readingId, "premium_report");

  if (!premiumAccess.hasAccess) {
    redirect(`/checkout/${readingId}?productType=premium_report`);
  }

  const reading = await getOrCreatePremiumReading(readingId);

  if (!reading) {
    notFound();
  }

  const elementProfile = calculatePetFiveElements({
    name: reading.petName,
    type: reading.species,
    birthDate: reading.birthDate || reading.metDate || null,
    birthTime: reading.birthTime,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
  });
  const primaryElementLabel = getElementLabel(elementProfile.primaryElement);
  const petPossessive = postposition.possessive(reading.petName);
  const petTopic = postposition.topic(reading.petName);
  const summaryKeywords = getElementKeywords(
    elementProfile.primaryElement,
    reading.species,
  );
  const hook = generatePetHook({
    petName: reading.petName,
    species: reading.species,
    dominantElement: elementProfile.primaryElement,
    secondaryElement: elementProfile.secondaryElement,
    scores: elementProfile.scores,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
  });
  const safePremiumSections = reading.premiumSections.map((section, index) => ({
    ...section,
    id: `premium-section-${index + 1}`,
    body: sanitizePremiumReport(section.body, reading.petName),
  }));

  return (
    <PageShell mascotType={reading.species}>
      <ReportMobileBar
        title="심층 리포트"
        backHref={`/result/free/${reading.id}`}
        rightLabel="PDF"
        rightHref={`/api/pdf/${reading.id}`}
      />

      <div className="grid gap-5">
        <ReportSceneBanner
          species={reading.species}
          title={`${reading.petName}의 심층 리포트 카드`}
          bubbleText="오행과 생활 리듬을 차분히 읽어볼게요"
        />

        <PetHookCard
          species={reading.species}
          hookSentence={hook.hookSentence}
          hookKeyword={hook.hookKeyword}
          hookSubcopy={hook.hookSubcopy}
          highlightWords={hook.highlightWords}
          size="large"
          mascot={
            <PetMascot
              species={reading.species}
              mood="reading"
              size="lg"
              label={`${reading.petName} 심층 리포트 훅 캐릭터`}
            />
          }
        />

        <section className="warm-panel overflow-hidden rounded-[2rem] p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-persimmon">
                심층 리포트 한 장 요약
              </p>
              <h1 className="mt-2 break-keep text-3xl font-black leading-tight text-ink sm:text-5xl">
                {petPossessive} 마음결을 읽는 안내서
              </h1>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-berry/10 bg-berry/10 px-4 py-4">
                  <p className="text-xs font-black text-berry">대표 기운</p>
                  <p className="mt-2 text-3xl font-black text-berry">
                    {primaryElementLabel}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-moss/15 bg-moss/10 px-4 py-4">
                  <p className="text-xs font-black text-moss">성향 키워드</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summaryKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-moss"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-persimmon/15 bg-persimmon/10 px-4 py-4 sm:col-span-2">
                  <p className="text-xs font-black text-persimmon">
                    보호자에게 보내는 신호
                  </p>
                  <p className="mt-2 break-keep text-lg font-black leading-7 text-ink">
                    {hook.hookKeyword}의 결로 천천히 마음을 표현하는 아이예요.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-berry/10 bg-white/75 px-4 py-4 sm:col-span-2">
                  <p className="text-xs font-black text-berry">오늘의 메시지</p>
                  <p className="mt-2 break-keep text-base font-bold leading-7 text-ink/75">
                    {petTopic} 자기 속도를 존중받을 때 가장 편안해져요.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative min-h-72 rounded-[2rem] border border-berry/10 bg-cream/70 p-5">
              <div className="grid min-h-64 place-items-center">
                <PetMascot
                  species={reading.species}
                  mood="holding-card"
                  size="hero"
                  withBubble
                  bubbleText={`${reading.petName}의 리포트가 준비됐어요!`}
                  label={`${reading.petName}의 심층 리포트 카드를 든 캐릭터`}
                />
              </div>
            </div>
          </div>
        </section>

        <PetElementBalance
          petName={reading.petName}
          species={reading.species}
          scores={elementProfile.scores}
        />

        <section className="rounded-[2rem] border border-berry/10 bg-white/78 p-5 shadow-soft sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-persimmon">
                리포트 목차
              </p>
              <h2 className="mt-2 break-keep text-2xl font-black text-ink">
                읽고 싶은 부분부터 열어보세요
              </h2>
            </div>
            <PetMascot
              species={reading.species}
              mood="reading"
              size="md"
              label={`${reading.petName} 목차 캐릭터`}
            />
          </div>
          <PremiumTableOfContents
            species={reading.species}
            sections={safePremiumSections.map((section) => ({
              id: section.id,
              title: section.title,
            }))}
          />
        </section>

        <div className="grid gap-5">
          {safePremiumSections.map((section, index) => {
            const paragraphs = splitPremiumBody(section.body);
            const summary = createSummaryText(section.body);

            return (
              <ReportAccordionSection
                key={`${section.title}-${index}`}
                id={section.id}
                index={index}
                title={section.title}
                summary={summary}
                defaultOpen={index === 0}
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-persimmon/10">
                    <PetMascot
                      species={reading.species}
                      mood={
                        index % 5 === 0
                          ? "star"
                          : index % 5 === 1
                            ? "happy"
                            : index % 5 === 2
                              ? "curious"
                              : index % 5 === 3
                                ? "reading"
                                : "holding-card"
                      }
                      size="sm"
                      label={`${section.title} 섹션 미니 캐릭터`}
                      className="scale-75"
                    />
                  </span>
                  <div>
                    <p className="text-sm font-black uppercase text-persimmon">
                      심층 해석 {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-1 break-keep text-2xl font-black leading-tight text-ink">
                      {section.title}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-berry/10 bg-berry/5 px-4 py-3">
                  <p className="text-xs font-black text-berry">짧은 요약</p>
                  <p className="mt-2 break-keep text-sm font-bold leading-6 text-ink/70">
                    {summary}
                  </p>
                </div>

                <div className="report-reading mt-5 space-y-4">
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${section.id}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-moss/20 bg-moss/10 px-4 py-3">
                  <p className="text-xs font-black text-moss">오늘 해볼 것</p>
                  <p className="mt-2 break-keep text-sm font-black leading-6 text-ink/70">
                    {createTodayAction(
                      section.title,
                      reading.petName,
                      reading.species,
                    )}
                  </p>
                </div>
              </ReportAccordionSection>
            );
          })}
        </div>

        <section className="rounded-[2rem] border border-moss/20 bg-moss/10 p-5 shadow-soft sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-black text-moss">PDF로 보관하기</p>
              <h2 className="mt-2 break-keep text-2xl font-black leading-tight text-ink">
                리포트를 PDF로 예쁘게 보관해요
              </h2>
              <p className="mt-3 break-keep text-sm font-semibold leading-6 text-ink/65">
                심층 리포트를 열람한 보호자에게 PDF 저장 기능을 무료로
                제공합니다.
              </p>
              <p className="mt-2 break-keep text-sm font-black leading-6 text-ink/70">
                표지, 한 장 요약, 오행 밸런스, 전체 리포트가 함께 담겨요.
              </p>
            </div>
            <PetMascot
              species={reading.species}
              mood="pdf"
              size="lg"
              label="PDF 문서를 든 캐릭터"
            />
          </div>
          <div className="mt-5">
            <PdfDownloadButton
              readingId={reading.id}
              petName={reading.petName}
              label="PDF로 저장하기"
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-berry/10 bg-white/65 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <PetMascot
              species={reading.species}
              mood="happy"
              size="md"
              withBubble
              bubbleText="다른 아이 이야기도 들어볼까요?"
              label={`${reading.petName} 결과 페이지 하단 캐릭터`}
            />
            <div>
              <p className="text-sm font-black text-persimmon">
                리포트 읽기 완료
              </p>
              <p className="mt-2 break-keep text-base font-bold leading-7 text-ink/70">
                이 리포트는 결론을 단정하기보다 {postposition.object(reading.petName)}
                더 다정하게 이해하기 위한 안내서예요.
              </p>
            </div>
          </div>
        </section>
      </div>

      <ReportFloatingActions
        saveHref={`/api/pdf/${reading.id}`}
        saveLabel={`${reading.petName} PDF 저장`}
      />
      <MobileStickyCTA
        href={`/api/pdf/${reading.id}`}
        label="PDF로 저장하기"
        subLabel="표지와 전체 리포트까지 함께 담겨요"
      />
    </PageShell>
  );
}
