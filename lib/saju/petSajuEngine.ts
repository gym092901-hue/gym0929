import { postposition } from "@/lib/korean/postposition";
import type { PetType } from "@/types/database";

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

export type PetSajuInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
};

export type FiveElementScore = Record<FiveElement, number>;

export type PetSajuProfile = {
  primaryElement: FiveElement;
  secondaryElement: FiveElement;
  scores: FiveElementScore;
  calculationBasis: "birth_date" | "adoption_date";
};

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const elementTraits: Record<FiveElement, string> = {
  wood: "호기심, 탐험, 산책 욕구, 성장",
  fire: "애교, 표현력, 흥분도, 존재감",
  earth: "안정감, 루틴, 먹성, 익숙한 공간",
  metal: "예민함, 경계심, 규칙성, 깔끔함",
  water: "관찰력, 감수성, 잠, 신중함",
};

const elementTone: Record<FiveElement, string> = {
  wood: "새로운 냄새와 길을 천천히 확인하며 세상을 넓혀가는 결",
  fire: "감정 표현이 빠르고 보호자에게 존재감을 또렷하게 전하는 결",
  earth: "익숙한 자리와 반복되는 순서 안에서 마음이 편안해지는 결",
  metal: "주변 변화를 예민하게 살피고 자기만의 기준을 세우는 결",
  water: "조용히 관찰하고 충분히 쉬며 마음을 정리하는 결",
};

const elementCare: Record<FiveElement, string> = {
  wood: "짧은 탐색 산책, 냄새 맡기 놀이, 새로운 장난감을 천천히 소개하는 방식",
  fire: "밝은 칭찬, 짧은 교감 놀이, 흥이 오른 뒤 차분히 마무리하는 방식",
  earth: "정해진 식사와 휴식 순서, 익숙한 담요나 자리, 반복되는 산책 리듬",
  metal: "갑작스러운 접촉보다 예고 있는 접근, 깔끔한 공간, 일정한 규칙",
  water: "조용한 휴식 자리, 부드러운 목소리, 충분히 관찰할 시간을 주는 방식",
};

const orderedElements: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

function createEmptyScores(): FiveElementScore {
  return {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

function elementFromMonth(month: number): FiveElement {
  if ([3, 4].includes(month)) return "wood";
  if ([5, 6].includes(month)) return "fire";
  if ([1, 2, 7, 8].includes(month)) return "earth";
  if ([9, 10].includes(month)) return "metal";
  return "water";
}

function elementFromYear(year: number): FiveElement {
  const lastDigit = year % 10;

  if ([4, 5].includes(lastDigit)) return "wood";
  if ([6, 7].includes(lastDigit)) return "fire";
  if ([8, 9].includes(lastDigit)) return "earth";
  if ([0, 1].includes(lastDigit)) return "metal";
  return "water";
}

function elementFromDay(day: number): FiveElement {
  return orderedElements[(day - 1) % orderedElements.length];
}

function elementFromHour(time: string | null): FiveElement | null {
  if (!time) {
    return null;
  }

  const hour = Number(time.split(":")[0]);

  if (Number.isNaN(hour)) {
    return null;
  }

  if (hour >= 3 && hour < 7) return "wood";
  if (hour >= 7 && hour < 11) return "earth";
  if (hour >= 11 && hour < 15) return "fire";
  if (hour >= 15 && hour < 19) return "metal";
  return "water";
}

function elementFromSpecies(type: PetType): FiveElement {
  return type === "dog" ? "earth" : "water";
}

function addScore(scores: FiveElementScore, element: FiveElement, amount: number) {
  scores[element] += amount;
}

function rankElements(scores: FiveElementScore) {
  return orderedElements
    .map((element) => ({ element, score: scores[element] }))
    .sort((a, b) => b.score - a.score || orderedElements.indexOf(a.element) - orderedElements.indexOf(b.element));
}

export function calculatePetFiveElements(input: PetSajuInput): PetSajuProfile {
  const birthDate = parseDate(input.birthDate);
  const adoptionDate = parseDate(input.adoptionDate);
  const basis = birthDate ?? adoptionDate;
  const calculationBasis = birthDate ? "birth_date" : "adoption_date";
  const scores = createEmptyScores();

  if (basis) {
    addScore(scores, elementFromYear(basis.year), 2);
    addScore(scores, elementFromMonth(basis.month), 3);
    addScore(scores, elementFromDay(basis.day), 2);
  }

  const hourElement = input.birthTimeUnknown ? null : elementFromHour(input.birthTime);
  if (hourElement) {
    addScore(scores, hourElement, 1);
  } else {
    addScore(scores, "water", 1);
  }

  addScore(scores, elementFromSpecies(input.type), 1);

  if (adoptionDate) {
    addScore(scores, elementFromMonth(adoptionDate.month), 1);
  }

  const ranked = rankElements(scores);

  return {
    primaryElement: ranked[0].element,
    secondaryElement: ranked[1].element,
    scores,
    calculationBasis,
  };
}

function speciesLabel(type: PetType) {
  return type === "dog" ? "강아지" : "고양이";
}

function relationshipStyle(primary: FiveElement, secondary: FiveElement) {
  if (primary === "fire") {
    return `보호자에게 반응을 크게 보여주며, ${elementLabels[secondary]}의 기운이 섞여 감정 표현 뒤에도 자기만의 속도를 지키려는 모습이 있습니다`;
  }

  if (primary === "water") {
    return `가까이 오기 전 보호자의 표정과 목소리를 먼저 살피고, ${elementLabels[secondary]}의 기운 덕분에 익숙해진 뒤에는 신뢰를 차분히 쌓아갑니다`;
  }

  if (primary === "metal") {
    return `처음에는 거리를 두고 확인하지만, 규칙과 약속이 반복되면 보호자에게 자기 기준 안의 애정을 또렷하게 보여줍니다`;
  }

  if (primary === "earth") {
    return `늘 곁에 머무는 안정적인 방식으로 마음을 표현하고, 익숙한 순서가 지켜질 때 보호자에게 더 편안하게 기대는 편입니다`;
  }

  return `새로운 자극을 보호자와 함께 확인하며 애착을 키우고, 반응을 살피면서 조금씩 자기 세계를 넓혀갑니다`;
}

function timeNote(input: PetSajuInput) {
  if (input.birthTimeUnknown) {
    return "태어난 시간은 모름으로 두고, 날짜와 입양일의 흐름을 중심으로 읽었습니다.";
  }

  if (input.birthTime) {
    return `태어난 시간 ${input.birthTime}의 기운은 세부 분위기를 살피는 보조 단서로만 반영했습니다.`;
  }

  return "태어난 시간이 비어 있어 날짜 흐름을 중심으로 읽었습니다.";
}

function assertSafeReport(report: string) {
  const forbiddenTerms = ["질병", "죽음", "사고", "수명"];
  const matchedTerm = forbiddenTerms.find((term) => report.includes(term));

  if (matchedTerm) {
    throw new Error(`Generated report contains a forbidden term: ${matchedTerm}`);
  }
}

export function generateFreePetSajuReading(input: PetSajuInput) {
  const profile = calculatePetFiveElements(input);
  const primaryLabel = elementLabels[profile.primaryElement];
  const secondaryLabel = elementLabels[profile.secondaryElement];
  const basisLabel =
    profile.calculationBasis === "birth_date" ? "생년월일" : "입양일";
  const petLabel = speciesLabel(input.type);
  const primaryTraits = elementTraits[profile.primaryElement];
  const secondaryTraits = elementTraits[profile.secondaryElement];
  const primaryTone = elementTone[profile.primaryElement];
  const primaryCare = elementCare[profile.primaryElement];
  const nameTopic = postposition.topic(input.name);
  const namePossessive = postposition.possessive(input.name);
  const nameTo = postposition.to(input.name);
  const nameObject = postposition.object(input.name);

  const report = [
    `한 줄 성향\n${nameTopic} ${primaryLabel}의 기운이 앞에 서고 ${secondaryLabel}의 결이 받쳐주는 ${petLabel}입니다. 한마디로 말하면 ${primaryTone}을 가진 아이예요. ${nameTopic} 보호자의 작은 신호에도 반응하면서, 자기 리듬이 존중될 때 더 밝고 편안한 모습을 보여줍니다.`,
    `대표 기운\n이번 무료 사주는 ${basisLabel}을 기준으로 오행을 간단히 계산한 규칙 기반 해석입니다. ${primaryLabel}은 ${primaryTraits}의 방향으로 드러나고, ${secondaryLabel}은 ${secondaryTraits}의 분위기를 더합니다. 그래서 ${nameTopic} 낯선 상황을 무작정 밀어붙이기보다 먼저 살피고, 익숙해지면 자기 방식으로 즐거움을 표현하는 흐름이 강합니다. ${timeNote(input)}`,
    `보호자와의 교감\n${namePossessive} 애착은 ${relationshipStyle(profile.primaryElement, profile.secondaryElement)}. 보호자가 이름을 불러주고 같은 말투로 칭찬해주면 ${nameTopic} 그 패턴을 기억합니다. 과한 요구보다 짧고 따뜻한 반응이 잘 맞고, 기다려주는 태도가 관계를 더 부드럽게 만들어줍니다.`,
    `생활 루틴 조언\n${nameTo}는 ${primaryCare}이 잘 어울립니다. 하루의 시작과 마무리에 비슷한 순서를 만들어주면 마음의 예측 가능성이 높아집니다. 산책, 놀이, 식사, 휴식을 갑자기 많이 바꾸기보다 작은 변화부터 보여주세요. ${nameTopic} 반복 속에서 안정감을 얻고, 그 안정감 안에서 새로운 행동도 더 자연스럽게 받아들입니다.`,
    `심층 리포트 미리보기\n심층 리포트에서는 ${namePossessive} 오행 균형, 보호자와의 관계 흐름, 잘 맞는 놀이와 휴식 방식, 계절별 생활 포인트를 더 자세히 볼 수 있습니다. 이 무료 결과는 한국식 사주와 오행 콘셉트를 반려동물 성향 콘텐츠로 풀어낸 맛보기이며, 단정이 아니라 보호자가 ${nameObject} 더 다정하게 이해하기 위한 참고로 보시면 좋습니다.`,
  ].join("\n\n");

  assertSafeReport(report);

  return {
    report,
    profile,
  };
}

export function getElementLabel(element: FiveElement) {
  return elementLabels[element];
}
