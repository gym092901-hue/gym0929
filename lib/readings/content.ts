import { postposition } from "@/lib/korean/postposition";
import { calculatePetFiveElements, type FiveElement } from "@/lib/saju/petSajuEngine";
import type { PetType } from "@/types/database";
import type { ReadingSection } from "@/types/reading";

type ReadingContentInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  freeSummary?: string;
};

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const elementMood: Record<FiveElement, string> = {
  wood: "호기심, 탐험, 성장의 기운",
  fire: "애교, 표현력, 존재감의 기운",
  earth: "안정감, 루틴, 익숙한 공간의 기운",
  metal: "섬세함, 경계심, 규칙성의 기운",
  water: "관찰력, 감수성, 신중함의 기운",
};

function speciesLabel(type: PetType) {
  return type === "dog" ? "강아지" : "고양이";
}

function speciesRoutine(type: PetType) {
  return type === "dog"
    ? "산책 전후의 같은 말, 같은 준비 순서, 돌아온 뒤 물 마시기와 쉬는 시간을 하나의 의식처럼 이어주면 좋아요."
    : "놀이를 갑자기 시작하기보다 시선 유도, 짧은 사냥놀이, 조용한 휴식 자리로 자연스럽게 이어주면 좋아요.";
}

export function createFreeInsightSections(
  input: ReadingContentInput,
): ReadingSection[] {
  const profile = calculatePetFiveElements(input);
  const primary = elementLabels[profile.primaryElement];
  const secondary = elementLabels[profile.secondaryElement];
  const primaryMood = elementMood[profile.primaryElement];
  const secondaryMood = elementMood[profile.secondaryElement];
  const basis =
    profile.calculationBasis === "birth_date"
      ? "생년월일"
      : "입양일 또는 처음 만난 날";
  const timeText = input.birthTimeUnknown
    ? "태어난 시간은 모름으로 반영해 날짜 중심으로 읽었어요."
    : input.birthTime
      ? `태어난 시간 ${input.birthTime}의 분위기도 보조로 반영했어요.`
      : "태어난 시간 정보가 없어 날짜 중심으로 읽었어요.";
  const nameTopic = postposition.topic(input.name);
  const nameSubject = postposition.subject(input.name);
  const namePossessive = postposition.possessive(input.name);
  const nameTo = postposition.to(input.name);
  const nameWith = postposition.with(input.name);

  return [
    {
      id: "one-line",
      title: "한 줄 성향",
      kicker: `${primary} 기운 중심`,
      icon: "✦",
      body: `${nameTopic} ${primary} 기운이 앞에서 밝게 드러나고, ${secondary} 기운이 옆에서 균형을 잡아주는 아이로 보여요. 한마디로 말하면 자기만의 속도로 세상을 살피다가, 마음이 편해지면 표현이 훨씬 부드럽게 열리는 타입입니다. 이 해석은 ${basis}을 기준으로 한 규칙 기반 엔터테인먼트 리포트이며, 보호자가 ${namePossessive} 생활 신호를 더 다정하게 읽도록 돕는 참고 콘텐츠입니다.`,
    },
    {
      id: "basic-energy",
      title: "대표 기운",
      kicker: "성향의 첫인상",
      icon: "☀",
      body: `${primaryMood}이 기본 바탕에 깔려 있고, ${secondaryMood}이 ${input.name}만의 반응 속도를 만들어줍니다. ${nameTopic} 처음부터 크게 밀어붙이기보다 자기만의 속도로 분위기를 확인하는 면이 있어요. 좋아하는 사람과 익숙한 공간에서는 안정적으로 마음을 열고, 낯선 변화 앞에서는 잠깐 멈춰서 살피는 경향이 보입니다. ${timeText}`,
    },
    {
      id: "guardian-bond",
      title: "보호자와의 교감",
      kicker: "사랑을 주고받는 방식",
      icon: "♡",
      body: `${nameTopic} 보호자의 목소리, 손길, 움직이는 순서를 꽤 섬세하게 기억하는 타입으로 보여요. 바로 크게 표현하지 않더라도 곁에 머물거나, 보호자가 부르면 시선을 맞추거나, 같은 자리를 반복해서 찾는 식으로 애착을 표현할 수 있습니다. ${speciesLabel(input.type)}에게 중요한 것은 거창한 이벤트보다 “늘 비슷하게 다정한 반응”이에요. 보호자가 차분히 기다려주면 ${input.name}도 자기 방식으로 더 편안하게 다가올 가능성이 큽니다.`,
    },
    {
      id: "routine",
      title: "생활 루틴 조언",
      kicker: "오늘부터 해볼 수 있는 것",
      icon: "⌂",
      body: `${nameTo}는 예측 가능한 하루의 흐름이 마음을 안정시키는 데 도움이 됩니다. ${speciesRoutine(input.type)} 밥, 놀이, 휴식의 순서가 자주 바뀌기보다 작은 규칙을 유지하면 ${nameSubject} 더 쉽게 안심할 수 있어요. 새로운 장난감이나 공간도 한 번에 많이 보여주기보다 하나씩 천천히 소개하는 편이 잘 맞습니다.`,
    },
    {
      id: "premium-preview",
      title: "심층 리포트 미리보기",
      kicker: "유료 리포트에서 확장되는 내용",
      icon: "◆",
      body: `심층 리포트에서는 ${namePossessive} 오행 밸런스, 타고난 성격의 장점, 보호자에게 사랑을 표현하는 방식, 예민해지기 쉬운 상황, 잘 맞는 생활 루틴, 올해의 흐름을 더 긴 호흡으로 풀어냅니다. 무료 결과가 “첫인상”이라면, 심층 리포트는 보호자가 ${nameWith} 실제 생활에서 어떻게 교감하면 좋을지 읽는 자세한 안내서에 가깝습니다.`,
    },
  ];
}

export function createPremiumPreviewSections(
  input: ReadingContentInput,
): ReadingSection[] {
  const profile = calculatePetFiveElements(input);
  const primary = elementLabels[profile.primaryElement];
  const secondary = elementLabels[profile.secondaryElement];
  const nameSubject = postposition.subject(input.name);
  const nameTo = postposition.to(input.name);
  const nameWith = postposition.with(input.name);

  return [
    {
      id: "premium-balance",
      title: "오행 밸런스",
      kicker: `${primary} + ${secondary}`,
      icon: "☯",
      body: `${nameTo} 강하게 드러나는 ${primary} 기운과 보조로 흐르는 ${secondary} 기운을 비교해, 어떤 순간에 활발해지고 어떤 순간에 조심스러워지는지 자세히 풀어냅니다.`,
    },
    {
      id: "premium-personality",
      title: "타고난 성격",
      kicker: "장점과 귀여운 습관",
      icon: "★",
      body: `${nameSubject} 가진 성격의 좋은 점, 보호자가 알아주면 더 빛나는 습관, 평소 행동 속에서 보이는 작은 신호를 따뜻하게 정리합니다.`,
    },
    {
      id: "premium-love",
      title: "사랑 표현 방식",
      kicker: "곁에 머무는 마음",
      icon: "♥",
      body: `${nameSubject} 보호자에게 애정을 보내는 방식이 몸짓, 시선, 기다림, 놀이 반응 중 어디에 가까운지 구체적으로 읽어줍니다.`,
    },
    {
      id: "premium-sensitive",
      title: "예민해지기 쉬운 순간",
      kicker: "무섭게 말하지 않는 안내",
      icon: "☁",
      body: `불안을 자극하는 표현 없이, ${nameSubject} 낯선 소리나 갑작스러운 변화 앞에서 어떤 속도로 적응하면 좋은지 부드럽게 안내합니다.`,
    },
    {
      id: "premium-routine",
      title: "잘 맞는 생활 루틴",
      kicker: "놀이와 휴식의 균형",
      icon: "☘",
      body: `${speciesLabel(input.type)}인 ${nameTo} 맞는 놀이, 산책 또는 사냥놀이, 휴식 흐름을 하루 루틴 관점에서 제안합니다.`,
    },
    {
      id: "premium-year",
      title: "올해의 흐름",
      kicker: "2026년 생활 리듬",
      icon: "☽",
      body: `2026년 동안 ${nameWith} 보호자가 함께 살펴보면 좋은 계절별 생활 포인트를 월별 조언으로 확장합니다.`,
    },
  ];
}

export function createFreeKeywords(input: ReadingContentInput) {
  return createFreeInsightSections(input).map((section) => section.title);
}
