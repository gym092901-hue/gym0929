import { PetMascot } from "@/components/mascot/PetMascot";
import { ReportActionButtons } from "@/components/report/ReportActionButtons";
import { ReportTable } from "@/components/report/ReportTable";
import type { FiveElement, FiveElementScore } from "@/lib/saju/petSajuEngine";
import type { PetSpecies } from "@/types/reading";

type PremiumA4ReportProps = {
  readingId: string;
  petName: string;
  species: PetSpecies;
  birthDate?: string | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  adoptionDate?: string | null;
  guardianEmail?: string | null;
  generatedAt: string;
  hookKeyword: string;
  primaryElement: FiveElement;
  scores: FiveElementScore;
  summaryKeywords: string[];
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

const elementInterpretation: Record<FiveElement, string> = {
  wood: "탐색과 호기심을 넓히는 기운",
  fire: "표정과 몸짓으로 마음을 드러내는 기운",
  earth: "반복되는 순서와 익숙한 공간에서 편해지는 기운",
  metal: "낯선 자극 앞에서 기준을 확인하는 기운",
  water: "분위기를 살피고 천천히 반응하는 기운",
};

const elementAdvice: Record<FiveElement, string> = {
  wood: "새로운 장난감이나 산책길을 천천히 소개해 주세요.",
  fire: "좋은 반응을 충분히 받아주고 차분한 마무리를 붙여 주세요.",
  earth: "밥, 놀이, 휴식의 순서를 일정하게 만들어 주세요.",
  metal: "낯선 소리나 사람 앞에서는 거리와 속도를 먼저 맞춰 주세요.",
  water: "조용히 관찰할 시간을 주고 부드러운 말투로 다가가 주세요.",
};

const orderedElements: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

function elementLevel(score: number) {
  if (score >= 4) return "강함";
  if (score >= 3) return "뚜렷함";
  if (score >= 2) return "보통";

  return "낮음";
}

function maskEmail(email?: string | null) {
  if (!email) {
    return null;
  }

  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return null;
  }

  const visibleName = name.slice(0, 2);
  return `${visibleName}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function basisLabel(birthDate?: string | null, adoptionDate?: string | null) {
  if (birthDate) {
    return `생년월일 ${birthDate}`;
  }

  if (adoptionDate) {
    return `처음 만난 날 ${adoptionDate}`;
  }

  return "입력한 기본 정보";
}

function basicTemperament(species: PetSpecies, petName: string) {
  if (species === "cat") {
    return `${petName}는 처음부터 모든 것을 빠르게 허락하기보다 자기 자리와 거리감을 먼저 확인하는 타입에 가까워요. 창밖 관찰, 느린 눈맞춤, 꼬리 끝 움직임처럼 작은 신호에서 마음의 온도가 드러날 수 있습니다.`;
  }

  return `${petName}는 처음부터 크게 뛰어들기보다 주변 분위기를 살피고, 편안하다고 느끼면 표정과 몸짓으로 마음을 보여주는 아이에 가까워요. 산책 전 신호, 보호자의 목소리 톤, 귀가 후 휴식 순서처럼 반복되는 장면에서 안정감을 느끼기 쉽습니다.`;
}

function attachmentCopy(species: PetSpecies, petName: string) {
  if (species === "cat") {
    return `${petName}는 큰 애교보다 같은 방에 조용히 머무르기, 자기 자리에서 보호자를 바라보기, 먼저 다가올 때까지 기다려주는 태도에서 신뢰가 쌓일 수 있어요. 손길보다 거리감 조절이 먼저인 아이로 보고, 짧은 사냥놀이 뒤에는 자기 자리로 돌아갈 시간을 남겨주세요.`;
  }

  return `${petName}는 보호자의 표정과 목소리 톤을 잘 살피는 아이일 수 있어요. 매일 반복되는 짧은 인사, 같은 말투의 칭찬, 산책이나 놀이 뒤의 조용한 마무리가 ${petName}에게는 중요한 약속처럼 느껴질 수 있습니다.`;
}

function dailyRoutineRows(species: PetSpecies) {
  if (species === "cat") {
    return [
      ["아침", "창가 관찰 자리 열어두기", "하루를 자기 속도로 확인할 수 있어요."],
      ["낮", "캣타워와 숨숨집 동선 유지", "선택할 수 있는 자리가 안정감을 줍니다."],
      ["저녁", "짧은 사냥놀이 후 자기 자리로 돌아가기", "활동과 휴식의 경계가 편안해져요."],
      ["밤", "화장실 동선과 잠자리 정리", "반복되는 환경 신호가 하루를 차분히 닫아줍니다."],
    ];
  }

  return [
    ["아침", "이름 부르며 짧게 인사", "하루 시작의 안정감을 만들 수 있어요."],
    ["낮", "익숙한 담요와 조용한 자리 준비", "혼자 있는 시간에도 냄새와 공간이 기준이 됩니다."],
    ["저녁", "산책 또는 노즈워크 뒤 조용한 칭찬", "활동 후 감정을 차분히 정리할 수 있어요."],
    ["밤", "같은 문장으로 마무리", "반복되는 신호가 편안한 약속이 됩니다."],
  ];
}

function monthlyRows(species: PetSpecies) {
  return [
    ["1월", "적응", species === "dog" ? "익숙한 산책길을 유지해 주세요." : "자기 자리와 창가 루틴을 유지해 주세요."],
    ["2월", "교감", "짧은 칭찬과 기다림의 순서를 만들어 보세요."],
    ["3월", "탐색", species === "dog" ? "새로운 냄새를 천천히 경험하게 해 주세요." : "새 장난감은 짧게 보여주고 스스로 다가오게 해 주세요."],
    ["4월", "관찰", species === "dog" ? "낯선 장소에서는 한 걸음 쉬어가 주세요." : "캣타워에서 내려다볼 시간을 충분히 주세요."],
    ["5월", "균형", "활동 뒤 조용한 휴식 시간을 붙여 주세요."],
    ["6월", "표현", "작은 신호를 알아보고 바로 반응해 주세요."],
    ["7월", "휴식", species === "dog" ? "실내 노즈워크로 짧게 집중해 보세요." : "숨숨집과 시원한 자리를 편하게 열어 주세요."],
    ["8월", "안정", "무리한 변화보다 익숙한 생활 순서를 지켜 주세요."],
    ["9월", "회복", species === "dog" ? "산책 리듬을 천천히 되찾아 보세요." : "놀이와 휴식의 시간을 분리해 주세요."],
    ["10월", "자극", "새로운 시도는 짧게, 마무리는 익숙하게 해 주세요."],
    ["11월", "정리", "잘 맞았던 루틴을 기록하고 이어가 보세요."],
    ["12월", "따뜻함", "같은 말투와 같은 순서로 하루를 마무리해 주세요."],
  ];
}

function reportTextFromSections(
  petName: string,
  species: PetSpecies,
  sections: PremiumA4ReportProps["sections"],
) {
  return [
    `${petName} 사주 심층 리포트`,
    `종: ${species === "dog" ? "강아지" : "고양이"}`,
    ...sections.map((section, index) => {
      return `${index + 1}. ${section.title}\n${section.body}`;
    }),
  ].join("\n\n");
}

export function PremiumA4Report({
  readingId,
  petName,
  species,
  birthDate,
  birthTime,
  birthTimeUnknown,
  adoptionDate,
  guardianEmail,
  generatedAt,
  hookKeyword,
  primaryElement,
  scores,
  summaryKeywords,
  sections,
}: PremiumA4ReportProps) {
  const speciesLabel = species === "dog" ? "강아지" : "고양이";
  const email = maskEmail(guardianEmail);
  const reportText = reportTextFromSections(petName, species, sections);
  const relationSummary =
    species === "dog" ? "천천히 마음을 여는 밀착형" : "거리감을 존중받을 때 깊어지는 신뢰형";
  const stablePoint =
    species === "dog" ? "반복되는 루틴과 익숙한 말투" : "자기 자리와 조용한 관찰 시간";
  const communicationKeyword =
    species === "dog" ? "기다림, 칭찬, 눈맞춤" : "기다림, 거리감, 느린 눈맞춤";

  return (
    <div className="grid gap-5" data-testid="premium-a4-report">
      <article className="mx-auto w-full max-w-[56rem] rounded-[2rem] border border-berry/10 bg-[#FFFDF8] p-5 shadow-soft sm:p-8 lg:min-h-[72rem]">
        <header className="border-b border-berry/10 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-persimmon">종합 리포트 보기</p>
              <h2 className="mt-2 break-keep text-3xl font-black leading-tight text-ink sm:text-4xl">
                {petName} 사주 심층 리포트
              </h2>
            </div>
            <PetMascot species={species} mood="holding-card" size="md" decorative />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["종", speciesLabel],
              ["분석 기준", basisLabel(birthDate, adoptionDate)],
              ["작성일", generatedAt],
              [
                "태어난 시간",
                birthTimeUnknown ? "태어난 시간 모름" : birthTime || "입력 없음",
              ],
              ...(email ? [["보호자 이메일", email]] : []),
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-berry/10 bg-cream/70 px-4 py-3"
              >
                <dt className="text-xs font-black text-berry">{label}</dt>
                <dd className="mt-1 font-black text-ink/75">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="mt-7">
          <h3 className="text-xl font-black text-ink">1. 한눈에 보는 우리 아이</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["대표 성향", hookKeyword || "신중한 관찰형"],
              ["애착 방식", relationSummary],
              ["안정 포인트", stablePoint],
              ["교감 키워드", communicationKeyword],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-[1.35rem] border border-berry/10 bg-berry/5 p-4"
              >
                <p className="text-xs font-black text-berry">{label}</p>
                <p className="mt-2 break-keep text-base font-black leading-6 text-ink">
                  {value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">2. 기본 기질 분석</h3>
          <div className="mt-3 space-y-3 break-keep text-sm font-semibold leading-7 text-ink/72">
            <p>{basicTemperament(species, petName)}</p>
            <p>
              낯선 환경에서는 보호자의 말투, 공간의 분위기, 익숙한 순서를 함께 살피는 흐름이 보여요.
              평소 행동에서는 {summaryKeywords.slice(0, 3).join(", ") || "차분함"} 같은 키워드가
              부드럽게 드러날 수 있습니다.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">3. 오행 밸런스 해석</h3>
          <div className="mt-3">
            <ReportTable
              caption={`${petName} 오행 밸런스`}
              columns={["오행", "강도", "성향 해석", "생활 속 조언"]}
              rows={orderedElements.map((element) => [
                elementLabels[element],
                elementLevel(scores[element]),
                elementInterpretation[element],
                element === primaryElement
                  ? `${elementAdvice[element]} 대표 기운으로 자연스럽게 드러나요.`
                  : elementAdvice[element],
              ])}
            />
          </div>
          <p className="mt-3 break-keep text-xs font-bold leading-5 text-ink/55">
            낮음은 평가가 아니라 생활 속에서 천천히 넓혀볼 수 있는 방향입니다.
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">4. 보호자와의 애착 방식</h3>
          <p className="mt-3 break-keep text-sm font-semibold leading-7 text-ink/72">
            {attachmentCopy(species, petName)}
          </p>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">5. 하루 루틴 추천</h3>
          <div className="mt-3">
            <ReportTable
              caption={`${petName} 하루 루틴 추천`}
              columns={["시간대", "추천 루틴", "이유"]}
              rows={dailyRoutineRows(species)}
            />
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">6. 올해의 흐름</h3>
          <div className="mt-3 space-y-3 break-keep text-sm font-semibold leading-7 text-ink/72">
            <p>
              올해는 새로운 것을 크게 바꾸기보다 보호자와 이미 잘 맞는 루틴을 조금씩 다듬어가기 좋은 흐름으로 볼 수 있어요.
            </p>
            <p>
              관계에서는 안정감을 쌓는 반복이 중요하고, 활동에서는 작은 시도 뒤 익숙한 마무리를 붙이는 방식이 잘 맞습니다.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-black text-ink">7. 월별 교감 캘린더</h3>
          <div className="mt-3">
            <ReportTable
              caption={`${petName} 월별 교감 캘린더`}
              columns={["월", "키워드", "보호자 실천법"]}
              rows={monthlyRows(species)}
            />
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-persimmon/15 bg-persimmon/10 p-4">
          <h3 className="text-lg font-black text-persimmon">
            8. 보호자에게 보내는 한 문장
          </h3>
          <p className="mt-3 break-keep text-base font-black leading-7 text-ink/75">
            {petName}는 완벽한 보호자를 바라는 것이 아니라, 매일 조금씩 같은 마음으로 다가와 주는 보호자를 가장 편안하게 느낄 수 있어요.
          </p>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-moss/15 bg-moss/10 p-4">
          <h3 className="text-lg font-black text-moss">9. 종합 소견</h3>
          <p className="mt-3 break-keep text-sm font-bold leading-7 text-ink/72">
            {petName}의 리포트는 성향을 단정하기보다 보호자가 생활 속에서 관찰하고 맞춰볼 수 있는 포인트를 모은 안내서예요.
            지금의 작은 루틴과 말투를 조금씩 다듬어가면 {petName}를 더 다정하게 이해하는 시간이 늘어날 수 있습니다.
          </p>
        </section>
      </article>

      <ReportActionButtons
        readingId={readingId}
        petName={petName}
        reportText={reportText}
      />
    </div>
  );
}
