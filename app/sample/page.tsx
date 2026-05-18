import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { FreeReadingExplorer } from "@/components/report/FreeReadingExplorer";
import { PetHookCard } from "@/components/report/PetHookCard";
import { ReportFloatingActions } from "@/components/report/ReportFloatingActions";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import { ReportSceneBanner } from "@/components/report/ReportSceneBanner";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { demoSamplePet } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { createFreeInsightSections } from "@/lib/readings/content";
import { generatePetHookFromSajuInput } from "@/lib/saju/petHookGenerator";

export default function SampleReportPage() {
  const sections = createFreeInsightSections({
    name: demoSamplePet.name,
    type: demoSamplePet.type,
    birthDate: demoSamplePet.birthDate,
    birthTime: demoSamplePet.birthTime,
    birthTimeUnknown: demoSamplePet.birthTimeUnknown,
    adoptionDate: demoSamplePet.adoptionDate,
  });
  const headlineSection = sections[0];
  const petPossessive = postposition.possessive(demoSamplePet.name);
  const hook = generatePetHookFromSajuInput(demoSamplePet);

  return (
    <PageShell
      eyebrow="샘플 리포트"
      title={`${petPossessive} 무료 사주 맛보기`}
      description="정식 서비스에서도 볼 수 있는 무료 결과 예시입니다. 결제나 데모 승인 없이 무료 리포트의 구성만 확인할 수 있습니다."
      mascotType={demoSamplePet.type}
    >
      <ReportMobileBar title="샘플 리포트" backHref="/" rightLabel="입력" rightHref="/input" />
      <div className="mb-6 grid gap-4">
        <ReportSceneBanner
          type={demoSamplePet.type}
          title="무료 샘플 리포트"
          bubbleText="샘플로 먼저 분위기를 확인해요"
        />
        <PetHookCard
          species={demoSamplePet.type}
          hookSentence={hook.hookSentence}
          hookKeyword={hook.hookKeyword}
          hookSubcopy={hook.hookSubcopy}
          highlightWords={hook.highlightWords}
          mascot={
            <PetMascot
              type={demoSamplePet.type}
              mood="holding-card"
              size="md"
              label="샘플 리포트 훅 캐릭터"
            />
          }
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-persimmon/10 px-4 py-2 text-sm font-bold text-persimmon">
              강아지
            </span>
            <span className="rounded-full bg-moss/10 px-4 py-2 text-sm font-bold text-moss">
              만난 날 {demoSamplePet.adoptionDate}
            </span>
            <span className="rounded-full bg-berry/10 px-4 py-2 text-sm font-bold text-berry">
              태어난 시간 모름
            </span>
          </div>

          <div className="mt-7 grid gap-5 rounded-[2rem] border border-berry/10 bg-white/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-berry/10 shadow-soft">
              <PetMascot
                species={demoSamplePet.type}
                mood="happy"
                size="md"
                label="샘플 강아지 캐릭터"
              />
            </div>
            <div>
              <p className="text-sm font-black text-persimmon">
                오늘의 미니 리딩
              </p>
              <h2 className="mt-1 break-keep text-2xl font-black text-ink">
                {petPossessive} 한 줄 성향
              </h2>
              <p className="mt-3 text-base leading-8 text-ink/75">
                {headlineSection.body}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <FreeReadingExplorer
              petName={demoSamplePet.name}
              species={demoSamplePet.type}
              sections={sections.slice(1)}
            />
          </div>
        </section>

        <aside className="h-fit rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-6 lg:sticky lg:top-6">
          <div className="rounded-[1.5rem] bg-white/85 p-5 shadow-sm">
            <p className="text-sm font-black text-moss">무료 샘플 전용</p>
            <h2 className="mt-2 break-keep text-xl font-black text-ink">
              실제 아이 정보로 다시 받아보세요
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              이 페이지는 샘플 리포트라 결제나 유료 페이지 이동 기능을
              제공하지 않습니다.
            </p>
          </div>
          <PrimaryLink href="/input" className="mt-6 w-full">
            우리 아이 사주 보기
          </PrimaryLink>
        </aside>
      </div>
      <ReportFloatingActions />
    </PageShell>
  );
}
