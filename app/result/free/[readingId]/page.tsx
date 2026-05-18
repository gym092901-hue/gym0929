import { notFound } from "next/navigation";
import { DemoPremiumDirectButton } from "@/components/demo/DemoPremiumDirectButton";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { MobileStickyCTA } from "@/components/report/MobileStickyCTA";
import { PetHookCard } from "@/components/report/PetHookCard";
import { ReportFloatingActions } from "@/components/report/ReportFloatingActions";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import { ReportSceneBanner } from "@/components/report/ReportSceneBanner";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { getProductCatalogItem } from "@/lib/products/catalog";
import { getReading, getSpeciesLabel } from "@/lib/readings";
import { generatePetHook } from "@/lib/saju/petHookGenerator";
import {
  calculatePetFiveElements,
  getElementLabel,
} from "@/lib/saju/petSajuEngine";
import type { ReadingSection } from "@/types/reading";
import type { PetSpecies } from "@/types/reading";

type FreeResultPageProps = {
  params: Promise<{
    readingId: string;
  }>;
};

function cleanSectionBody(body?: string) {
  return (body ?? "")
    .replace(/^\s*\d+\.\s*[^\n]+\n?/, "")
    .replace(/\n\s*\d+\.\s*[^\n]+\n?/g, "\n")
    .trim();
}

function sectionById(
  sections: ReadingSection[],
  id: string,
  fallbackIndex: number,
) {
  return sections.find((section) => section.id === id) ?? sections[fallbackIndex];
}

function SummaryCard({
  title,
  body,
  accent,
  mascotMood,
  species,
}: {
  title: string;
  body: string;
  accent: "berry" | "moss" | "persimmon";
  mascotMood: "happy" | "curious" | "star" | "holding-card";
  species: PetSpecies;
}) {
  const tone = {
    berry: "border-berry/15 bg-berry/5 text-berry",
    moss: "border-moss/20 bg-moss/10 text-moss",
    persimmon: "border-persimmon/20 bg-persimmon/10 text-persimmon",
  }[accent];

  return (
    <article className={`rounded-[2rem] border p-5 shadow-soft ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/80">
          <PetMascot
            species={species}
            mood={mascotMood}
            size="sm"
            label={`${title} 미니 캐릭터`}
            className="scale-75"
          />
        </span>
        <div className="min-w-0">
          <h3 className="break-keep text-lg font-black leading-tight text-ink">
            {title}
          </h3>
          <p className="mt-3 whitespace-pre-line break-keep text-sm font-bold leading-7 text-ink/68">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

export default async function FreeResultPage({ params }: FreeResultPageProps) {
  const { readingId } = await params;
  const demoModeEnabled = isDemoModeEnabled();
  const reading = await getReading(readingId);

  if (!reading) {
    notFound();
  }

  const premiumProduct = getProductCatalogItem("premium_report");
  const premiumPrice = premiumProduct.price.toLocaleString("ko-KR");
  const premiumHref = `/checkout/${reading.id}?productType=premium_report`;
  const petPossessive = postposition.possessive(reading.petName);
  const petObject = postposition.object(reading.petName);
  const petTopic = postposition.topic(reading.petName);
  const freeSections = reading.freeSections.slice(0, 5);
  const oneLineSection = sectionById(freeSections, "one-line", 0);
  const energySection = sectionById(freeSections, "basic-energy", 1);
  const bondSection = sectionById(freeSections, "guardian-bond", 2);
  const routineSection = sectionById(freeSections, "routine", 3);

  const elementProfile = calculatePetFiveElements({
    name: reading.petName,
    type: reading.species,
    birthDate: reading.birthDate || reading.metDate || null,
    birthTime: reading.birthTime,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
  });
  const representativeElement = getElementLabel(elementProfile.primaryElement);
  const hook = generatePetHook({
    petName: reading.petName,
    species: reading.species,
    dominantElement: elementProfile.primaryElement,
    secondaryElement: elementProfile.secondaryElement,
    scores: elementProfile.scores,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
  });

  const lockedItems = [
    "오행 밸런스 전체 분석",
    "예민해지기 쉬운 상황",
    "보호자에게 사랑을 표현하는 방식",
    "올해의 흐름",
    "월별 생활 체크리스트",
    "PDF 무료 저장",
  ];

  return (
    <PageShell mascotType={reading.species}>
      <ReportMobileBar
        title="무료 사주 맛보기"
        backHref="/input"
        rightLabel="무료"
        rightTone="free"
      />

      <div className="grid gap-5">
        <ReportSceneBanner
          species={reading.species}
          title={`${reading.petName} 무료 리포트`}
          bubbleText="우리 아이 마음결을 살짝 읽어볼까요?"
        />

        <PetHookCard
          species={reading.species}
          hookSentence={hook.hookSentence}
          hookKeyword={hook.hookKeyword}
          hookSubcopy={hook.hookSubcopy}
          highlightWords={hook.highlightWords}
          mascot={
            <PetMascot
              species={reading.species}
              mood="star"
              size="md"
              label={`${reading.petName} 훅 문장 캐릭터`}
            />
          }
        />

        <section className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black text-persimmon">대표 해석</p>
              <h1 className="mt-2 break-keep text-3xl font-black leading-tight text-ink sm:text-5xl">
                {petPossessive} 한 줄 성향
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-moss/10 px-4 py-2 text-sm font-black text-moss">
                  무료 열람 중
                </span>
                <span className="rounded-full bg-persimmon/10 px-4 py-2 text-sm font-bold text-persimmon">
                  {getSpeciesLabel(reading.species)}
                </span>
                <span className="rounded-full bg-moss/10 px-4 py-2 text-sm font-bold text-moss">
                  만난 날 {reading.metDate || "미입력"}
                </span>
                <span className="rounded-full bg-berry/10 px-4 py-2 text-sm font-bold text-berry">
                  태어난 시간 {reading.birthTime ?? "모름"}
                </span>
              </div>
              <p className="mt-5 whitespace-pre-line break-keep text-lg font-semibold leading-9 text-ink/75">
                {cleanSectionBody(oneLineSection?.body) ||
                  `${petTopic} 자기만의 속도로 마음을 보여주는 아이예요.`}
              </p>
            </div>
            <div className="grid place-items-center rounded-[2rem] bg-berry/10 p-4 shadow-soft lg:min-w-56">
              <PetMascot
                species={reading.species}
                mood="happy"
                size="lg"
                withBubble
                bubbleText="내 마음결을 살짝 보여줄게요"
                label={`${reading.petName} 무료 리포트 캐릭터`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="대표 기운"
            body={`대표 기운은 ${representativeElement}이에요. ${cleanSectionBody(
              energySection?.body,
            )}`}
            accent="berry"
            mascotMood="star"
            species={reading.species}
          />
          <SummaryCard
            title="보호자와의 교감"
            body={cleanSectionBody(bondSection?.body)}
            accent="moss"
            mascotMood="happy"
            species={reading.species}
          />
          <SummaryCard
            title="생활 루틴 조언"
            body={cleanSectionBody(routineSection?.body)}
            accent="persimmon"
            mascotMood="holding-card"
            species={reading.species}
          />
        </section>

        <section className="warm-panel rounded-[2rem] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black text-moss">심층 리포트 잠금 해제</p>
              <h2 className="mt-2 break-keep text-2xl font-black leading-tight text-ink sm:text-4xl">
                {petObject} 더 깊게 이해하고 싶다면
              </h2>
              <p className="mt-3 break-keep text-base font-semibold leading-7 text-ink/65">
                지금 보고 있는 무료 맛보기는 결제 없이 계속 열람할 수 있어요.
                심층 리포트에서는 오행 밸런스, 애착 방식, 예민해지기 쉬운 순간,
                올해의 흐름까지 더 자세히 읽어드립니다.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-berry/10 px-5 py-4 text-center">
              <p className="text-xs font-black text-berry">심층 리포트</p>
              <p className="mt-1 text-3xl font-black text-ink">
                {premiumPrice}원
              </p>
              <p className="mt-1 text-xs font-bold text-ink/50">
                결제 후 바로 열람 · PDF 무료 저장 가능
              </p>
            </div>
          </div>
          <PrimaryLink href={premiumHref} className="mt-5 w-full">
            {reading.petName} 심층 리포트 보기
          </PrimaryLink>
        </section>

        <section className="rounded-[2rem] border border-berry/10 bg-white/80 p-5 shadow-soft sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-persimmon">
                심층 리포트에서 열리는 내용
              </p>
              <h2 className="mt-2 break-keep text-2xl font-black text-ink">
                지금은 살짝 잠겨 있어요
              </h2>
            </div>
            <PetMascot
              species={reading.species}
              mood="reading"
              size="md"
              label={`${reading.petName} 잠금 카드 캐릭터`}
            />
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {lockedItems.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-cream/75 px-4 py-3 text-sm font-black text-ink/70"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/5 text-xs text-ink/45">
                  잠금
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold leading-6 text-ink/60">
            무서운 예언이 아니라, 반려생활을 다정하게 이해하기 위한
            엔터테인먼트 콘텐츠입니다.
          </p>

          {demoModeEnabled ? (
            <div className="mt-5 rounded-2xl border border-ink/10 bg-ink/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ink/50">
                  검수용
                </span>
                <p className="text-sm font-bold text-ink/55">
                  데모 모드에서만 보이는 프리미엄 바로 보기입니다.
                </p>
              </div>
              <DemoPremiumDirectButton readingId={reading.id} />
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-berry/10 bg-white/65 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <PetMascot
              species={reading.species}
              mood="holding-card"
              size="md"
              withBubble
              bubbleText={`${petTopic} 아직 보여줄 이야기가 더 있어요`}
              label={`${reading.petName} 리포트를 들고 있는 캐릭터`}
            />
            <div>
              <p className="text-sm font-black text-persimmon">
                무료 맛보기 완료
              </p>
              <p className="mt-2 break-keep text-base font-bold leading-7 text-ink/70">
                무료 결과는 첫인상에 가까워요. 심층 리포트에서는 보호자가
                일상에서 바로 써볼 수 있는 관계 해석과 생활 체크리스트까지
                이어집니다.
              </p>
            </div>
          </div>
        </section>
      </div>

      <ReportFloatingActions />
      <MobileStickyCTA
        href={premiumHref}
        label={`심층 리포트 보기 · ${premiumPrice}원`}
        subLabel="현재 무료 맛보기는 무료 열람 중 · 결제 후 심층 리포트 열람"
      />
    </PageShell>
  );
}
