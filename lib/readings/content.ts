import { postposition } from "@/lib/korean/postposition";
import {
  createLifestyleContextCopy,
  emptyLifestyleProfile,
} from "@/lib/readings/lifestyle";
import { sanitizeReportText } from "@/lib/reports/sanitizeReportText";
import { calculatePetFiveElements, type FiveElement } from "@/lib/saju/petSajuEngine";
import type { PetType } from "@/types/database";
import type { PetLifestyleProfile, ReadingSection } from "@/types/reading";

type ReadingContentInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  freeSummary?: string;
  lifestyle?: PetLifestyleProfile;
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
    : "창밖 관찰 시간, 캣타워 오르내림, 짧은 사냥놀이, 숨숨집에서 쉬는 흐름을 자연스럽게 이어주면 좋아요.";
}

function sanitizeReadingSections(
  sections: ReadingSection[],
  input: ReadingContentInput,
  context: string,
) {
  return sections.map((section) => ({
    ...section,
    body: sanitizeReportText(section.body, {
      context: `${context}.${section.id}`,
      petName: input.name,
    }),
  }));
}

export function createFreeInsightSections(
  input: ReadingContentInput,
): ReadingSection[] {
  const profile = calculatePetFiveElements(input);
  const primary = elementLabels[profile.primaryElement];
  const primaryMood = elementMood[profile.primaryElement];
  const secondaryMood = elementMood[profile.secondaryElement];
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
  const lifestyleCopy = createLifestyleContextCopy(
    input.lifestyle ?? emptyLifestyleProfile,
    input.type,
  );
  const strangerLine = lifestyleCopy.strangerCopy
    ? input.type === "cat"
      ? ` 입력해 준 낯선 사람 반응도 ${lifestyleCopy.strangerCopy}이라서, 보호자는 손길보다 거리와 자리를 먼저 열어주는 편이 좋아요.`
      : ` 입력해 준 낯선 사람 반응도 ${lifestyleCopy.strangerCopy}이라서, 보호자의 목소리와 접근 속도가 중요한 단서가 됩니다.`
    : "";
  const distanceLine = lifestyleCopy.distanceLabel
    ? input.type === "cat"
      ? ` 보호자와의 거리감이 “${lifestyleCopy.distanceLabel}”에 가깝다면 같은 방에 조용히 머무르는 시간을 신뢰 표현으로 읽어주세요.`
      : ` 보호자와의 거리감이 “${lifestyleCopy.distanceLabel}”에 가깝다면 부름, 칭찬, 기다림의 톤을 일정하게 맞춰주세요.`
    : "";
  const routineLifestyleLine = lifestyleCopy.activityCopy;
  const favoriteLine = lifestyleCopy.favoriteLabels.length
    ? ` 특히 ${lifestyleCopy.favoriteLabels.join(", ")}을 좋아한다고 알려준 점은 오늘의 루틴을 고르는 좋은 단서예요.`
    : "";
  const questionLine = lifestyleCopy.questionLabels.length
    ? ` 보호자가 궁금해한 ${lifestyleCopy.questionLabels.join(", ")}은 심층 리포트에서 더 구체적으로 이어집니다.`
    : "";
  const oneLineBody =
    input.type === "cat"
      ? `${nameTopic} 자기 자리에서 보호자를 바라보다가, 편안하다고 느낄 때만 짧고 선명한 신호를 보내는 고양이예요. 창밖 관찰, 느린 눈맞춤, 꼬리 끝 움직임을 알아봐 주면 ${nameSubject} 같은 방에 더 오래 조용히 머물 가능성이 큽니다.`
      : `${nameTopic} 처음엔 주변 분위기를 살피지만, 편안하다고 느끼면 표정과 몸짓으로 애정을 보여주는 아이예요. 보호자가 급하게 다가가기보다 같은 톤으로 불러주고 기다려줄 때 ${nameSubject} 더 자연스럽게 마음을 열 가능성이 큽니다.`;
  const energyBody =
    input.type === "cat"
      ? `${primaryMood}이 기본 바탕에 깔려 있고, ${secondaryMood}이 ${input.name}만의 거리 조절 방식을 만들어줍니다. ${nameTopic} 처음부터 다가가기보다 창밖 관찰, 집 안 동선 확인, 캣타워에서 내려다보기처럼 분위기를 먼저 살피는 면이 있어요. 낯선 변화 앞에서는 숨숨집이나 익숙한 자기 자리에서 한 박자 쉬며 안전한 거리를 고르는 경향이 보입니다.${strangerLine} ${timeText}`
      : `${primaryMood}이 기본 바탕에 깔려 있고, ${secondaryMood}이 ${input.name}만의 반응 속도를 만들어줍니다. ${nameTopic} 처음부터 크게 밀어붙이기보다 자기만의 속도로 분위기를 확인하는 면이 있어요. 좋아하는 사람과 익숙한 공간에서는 안정적으로 마음을 열고, 낯선 변화 앞에서는 잠깐 멈춰서 살피는 경향이 보입니다.${strangerLine} ${timeText}`;
  const bondBody =
    input.type === "cat"
      ? `${nameTopic} 보호자의 생활 리듬, 문이 열리는 소리, 자주 머무는 자리의 분위기를 조용히 기억하는 타입으로 보여요. 자기 자리에서 보호자를 바라보기, 느린 눈맞춤, 꼬리 끝 움직임, 같은 방에 조용히 머무르기는 ${nameSubject} 보내는 신뢰의 거리감일 수 있습니다. 손길보다 거리감 조절이 먼저인 아이일 수 있으니, 보호자가 먼저 다가올 때까지 기다려주면 ${input.name}도 자기 속도로 곁을 내줄 가능성이 큽니다.${distanceLine}`
      : `${nameTopic} 보호자의 목소리, 손길, 움직이는 순서를 꽤 섬세하게 기억하는 타입으로 보여요. 바로 크게 표현하지 않더라도 곁에 머물거나, 보호자가 부르면 시선을 맞추거나, 같은 자리를 반복해서 찾는 식으로 애착을 표현할 수 있습니다. 강아지에게 중요한 것은 거창한 이벤트보다 “늘 비슷하게 다정한 반응”이에요. 보호자가 차분히 기다려주면 ${input.name}도 자기 방식으로 더 편안하게 다가올 가능성이 큽니다.${distanceLine}`;
  const routineBody =
    input.type === "cat"
      ? `${nameTo}는 예측 가능한 실내 리듬이 마음을 안정시키는 데 도움이 됩니다. ${routineLifestyleLine} ${speciesRoutine(input.type)} 짧은 사냥놀이 후 자기 자리로 돌아가기, 캣타워에서 내려다보기, 숨숨집에서 쉬는 선택지가 이어지면 ${nameSubject} 더 쉽게 안심할 수 있어요. 새로운 장난감이나 박스도 한 번에 가까이 두기보다 먼저 다가올 때까지 기다리며 천천히 소개하는 편이 잘 맞습니다.${favoriteLine}`
      : `${nameTo}는 예측 가능한 하루의 흐름이 마음을 안정시키는 데 도움이 됩니다. ${routineLifestyleLine} ${speciesRoutine(input.type)} 밥, 놀이, 휴식의 순서가 자주 바뀌기보다 작은 규칙을 유지하면 ${nameSubject} 더 쉽게 안심할 수 있어요. 새로운 장난감이나 공간도 한 번에 많이 보여주기보다 하나씩 천천히 소개하는 편이 잘 맞습니다.${favoriteLine}`;
  const premiumPreviewBody =
    input.type === "cat"
      ? `심층 리포트에서는 ${namePossessive} 오행 밸런스, 타고난 성격의 장점, 보호자에게 신뢰를 보여주는 거리감, 예민해지기 쉬운 상황, 잘 맞는 실내 루틴, 올해의 흐름을 더 긴 호흡으로 풀어냅니다. 무료 결과가 “첫인상”이라면, 심층 리포트는 보호자가 ${nameWith} 창밖 관찰, 짧은 사냥놀이, 자기 자리, 숨숨집처럼 실제 생활에서 보이는 신호를 어떻게 읽으면 좋을지 정리한 자세한 안내서에 가깝습니다.${questionLine}`
      : `심층 리포트에서는 ${namePossessive} 오행 밸런스, 타고난 성격의 장점, 보호자에게 사랑을 표현하는 방식, 예민해지기 쉬운 상황, 잘 맞는 생활 루틴, 올해의 흐름을 더 긴 호흡으로 풀어냅니다. 무료 결과가 “첫인상”이라면, 심층 리포트는 보호자가 ${nameWith} 실제 생활에서 어떻게 교감하면 좋을지 읽는 자세한 안내서에 가깝습니다.${questionLine}`;

  const sections: ReadingSection[] = [
    {
      id: "one-line",
      title: "한 줄 성향",
      kicker: `${primary} 기운 중심`,
      icon: "✦",
      body: oneLineBody,
    },
    {
      id: "basic-energy",
      title: "대표 기운",
      kicker: "성향의 첫인상",
      icon: "☀",
      body: energyBody,
    },
    {
      id: "guardian-bond",
      title: "보호자와의 교감",
      kicker: "사랑을 주고받는 방식",
      icon: "♡",
      body: bondBody,
    },
    {
      id: "routine",
      title: "생활 루틴 조언",
      kicker: "오늘부터 해볼 수 있는 것",
      icon: "⌂",
      body: routineBody,
    },
    {
      id: "premium-preview",
      title: "심층 리포트 미리보기",
      kicker: "유료 리포트에서 확장되는 내용",
      icon: "◆",
      body: premiumPreviewBody,
    },
  ];

  return sanitizeReadingSections(sections, input, "free_insight_sections");
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
  const lifestyleCopy = createLifestyleContextCopy(
    input.lifestyle ?? emptyLifestyleProfile,
    input.type,
  );
  const favoriteLine = lifestyleCopy.favoriteLabels.length
    ? ` 특히 ${lifestyleCopy.favoriteLabels.join(", ")}처럼 실제로 좋아하는 활동을 함께 반영합니다.`
    : "";
  const strangerLine = lifestyleCopy.strangerCopy
    ? ` 낯선 사람 반응은 ${lifestyleCopy.strangerCopy}으로 보고 더 구체화합니다.`
    : "";
  const balanceBody =
    input.type === "cat"
      ? `${nameTo} 또렷하게 드러나는 ${primary} 기운과 보조로 흐르는 ${secondary} 기운을 비교해, 자기 자리에서 편안해지는 순간과 창밖 관찰처럼 호기심이 살아나는 순간을 자세히 풀어냅니다.`
      : `${nameTo} 강하게 드러나는 ${primary} 기운과 보조로 흐르는 ${secondary} 기운을 비교해, 어떤 순간에 활발해지고 어떤 순간에 조심스러워지는지 자세히 풀어냅니다.`;
  const personalityBody =
    input.type === "cat"
      ? `${nameSubject} 가진 성격의 좋은 점, 느린 눈맞춤이나 꼬리 움직임처럼 보호자가 알아주면 더 선명해지는 신호, 자기 속도 안에서 드러나는 귀여운 습관을 정리합니다.`
      : `${nameSubject} 가진 성격의 좋은 점, 보호자가 알아주면 더 빛나는 습관, 평소 행동 속에서 보이는 작은 신호를 따뜻하게 정리합니다.`;
  const loveBody =
    input.type === "cat"
      ? `${nameSubject} 같은 방에 조용히 머무르기, 자기 자리에서 보호자를 바라보기, 먼저 다가왔다가 물러나는 거리감처럼 고양이다운 신뢰 표현을 구체적으로 읽어줍니다.`
      : `${nameSubject} 보호자에게 애정을 보내는 방식이 몸짓, 시선, 기다림, 놀이 반응 중 어디에 가까운지 구체적으로 읽어줍니다.`;
  const sensitiveBody =
    input.type === "cat"
      ? `불안을 자극하는 표현 없이, ${nameSubject} 낯선 소리나 갑작스러운 변화 앞에서 캣타워, 숨숨집, 자기 자리 같은 선택지를 두고 어떤 속도로 적응하면 좋은지 부드럽게 안내합니다.${strangerLine}`
      : `불안을 자극하는 표현 없이, ${nameSubject} 낯선 소리나 갑작스러운 변화 앞에서 어떤 속도로 적응하면 좋은지 부드럽게 안내합니다.${strangerLine}`;
  const routineBody =
    input.type === "cat"
      ? `${speciesLabel(input.type)}인 ${nameTo} 맞는 창밖 관찰, 짧은 사냥놀이, 캣타워와 숨숨집 휴식 흐름을 하루 루틴 관점에서 제안합니다.${favoriteLine}`
      : `${speciesLabel(input.type)}인 ${nameTo} 맞는 산책, 놀이, 휴식 흐름을 하루 루틴 관점에서 제안합니다.${favoriteLine}`;
  const yearBody =
    input.type === "cat"
      ? `2026년 동안 ${nameWith} 보호자가 함께 살펴보면 좋은 계절별 실내 환경, 짧은 사냥놀이, 자기 자리 안정 포인트를 월별 조언으로 확장합니다.`
      : `2026년 동안 ${nameWith} 보호자가 함께 살펴보면 좋은 계절별 생활 포인트를 월별 조언으로 확장합니다.`;

  const sections: ReadingSection[] = [
    {
      id: "premium-balance",
      title: "오행 밸런스",
      kicker: `${primary} + ${secondary}`,
      icon: "☯",
      body: balanceBody,
    },
    {
      id: "premium-personality",
      title: "타고난 성격",
      kicker: "장점과 귀여운 습관",
      icon: "★",
      body: personalityBody,
    },
    {
      id: "premium-love",
      title: "사랑 표현 방식",
      kicker: "곁에 머무는 마음",
      icon: "♥",
      body: loveBody,
    },
    {
      id: "premium-sensitive",
      title: "예민해지기 쉬운 순간",
      kicker: "무섭게 말하지 않는 안내",
      icon: "☁",
      body: sensitiveBody,
    },
    {
      id: "premium-routine",
      title: "잘 맞는 생활 루틴",
      kicker: "놀이와 휴식의 균형",
      icon: "☘",
      body: routineBody,
    },
    {
      id: "premium-year",
      title: "올해의 흐름",
      kicker: "2026년 생활 리듬",
      icon: "☽",
      body: yearBody,
    },
  ];

  return sanitizeReadingSections(sections, input, "premium_preview_sections");
}

export function createFreeKeywords(input: ReadingContentInput) {
  return createFreeInsightSections(input).map((section) => section.title);
}
