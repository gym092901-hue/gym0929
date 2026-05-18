import { postposition } from "@/lib/korean/postposition";
import {
  calculatePetFiveElements,
  getElementLabel,
  type FiveElement,
  type FiveElementScore,
  type PetSajuInput,
} from "@/lib/saju/petSajuEngine";
import type { PetType } from "@/types/database";

export type PetHookGeneratorInput = {
  petName?: string | null;
  species: PetType;
  dominantElement: FiveElement;
  secondaryElement: FiveElement;
  scores: FiveElementScore;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
};

export type PetHookResult = {
  hookSentence: string;
  hookKeyword: string;
  hookSubcopy: string;
  highlightWords: string[];
};

type SpeciesKeywordMap = Record<PetType, string[]>;

const elementKeywords: Record<FiveElement, SpeciesKeywordMap> = {
  wood: {
    dog: ["호기심 탐험가", "산책길 모험가", "냄새 수집가"],
    cat: ["창밖 탐험가", "조용한 호기심러", "영역 확장러"],
  },
  fire: {
    dog: ["햇살 애교쟁이", "반응형 사랑둥이", "꼬리로 말하는 아이"],
    cat: ["짧고 강한 표현가", "눈빛 애교러", "선택적 다정러"],
  },
  earth: {
    dog: ["루틴 지킴이", "안정형 마음부자", "익숙한 품을 좋아하는 아이"],
    cat: ["자기 자리 수호자", "안정형 냥이", "루틴 장인"],
  },
  metal: {
    dog: ["섬세한 관찰러", "신중한 경계형", "조용한 기준러"],
    cat: ["도도한 관찰자", "선 긋는 마음부자", "예민한 기준러"],
  },
  water: {
    dog: ["눈빛으로 읽는 감성러", "조용한 공감러", "신중한 마음읽기형"],
    cat: ["깊은 밤의 철학자", "조용한 감수성러", "분위기 관찰자"],
  },
};

const combinationHooks: Partial<
  Record<
    `${FiveElement}+${FiveElement}`,
    Record<PetType, { phrase: string; keyword: string; highlights: string[] }>
  >
> = {
  "metal+fire": {
    dog: {
      phrase: "신중하게 살피다 마음이 열리면 온몸으로 다가오는 섬세한 애교쟁이",
      keyword: "섬세한 애교쟁이",
      highlights: ["신중하게", "마음이 열리면", "섬세한 애교쟁이"],
    },
    cat: {
      phrase: "도도하게 거리를 보다가 믿는 순간 짧고 진하게 표현하는 선택적 애교러",
      keyword: "선택적 애교러",
      highlights: ["도도하게", "믿는 순간", "선택적 애교러"],
    },
  },
  "metal+water": {
    dog: {
      phrase: "말보다 눈빛으로 먼저 확인하는 조용한 관찰러",
      keyword: "조용한 관찰러",
      highlights: ["눈빛으로", "먼저 확인하는", "조용한 관찰러"],
    },
    cat: {
      phrase: "조용히 지켜보다가 마음을 허락한 사람에게만 기대는 깊은 관찰자",
      keyword: "깊은 관찰자",
      highlights: ["조용히", "마음을 허락한", "깊은 관찰자"],
    },
  },
  "fire+wood": {
    dog: {
      phrase: "신나면 세상이 전부 놀이터가 되는 햇살 탐험가",
      keyword: "햇살 탐험가",
      highlights: ["신나면", "놀이터가 되는", "햇살 탐험가"],
    },
    cat: {
      phrase: "새로운 자극 앞에서 눈빛이 반짝이는 선택적 호기심러",
      keyword: "선택적 호기심러",
      highlights: ["새로운 자극", "눈빛이 반짝이는", "선택적 호기심러"],
    },
  },
  "earth+metal": {
    dog: {
      phrase: "익숙한 루틴 안에서 가장 편안해지는 안정형 기준러",
      keyword: "안정형 기준러",
      highlights: ["익숙한 루틴", "편안해지는", "안정형 기준러"],
    },
    cat: {
      phrase: "자기 자리와 자기 속도가 분명한 루틴 수호자",
      keyword: "루틴 수호자",
      highlights: ["자기 자리", "자기 속도", "루틴 수호자"],
    },
  },
  "water+earth": {
    dog: {
      phrase: "조용히 마음을 읽고 익숙한 품에서 편안해지는 감성형 아이",
      keyword: "감성형 아이",
      highlights: ["조용히 마음을 읽고", "익숙한 품", "감성형 아이"],
    },
    cat: {
      phrase: "혼자만의 시간을 지키면서도 익숙한 사람 곁에 머무는 조용한 마음부자",
      keyword: "조용한 마음부자",
      highlights: ["혼자만의 시간", "익숙한 사람 곁", "조용한 마음부자"],
    },
  },
};

const elementLeadPhrases: Record<FiveElement, Record<PetType, string>> = {
  wood: {
    dog: "새로운 냄새와 길을 만나면 눈빛이 먼저 반짝이는",
    cat: "익숙한 자리에서 천천히 세상을 넓혀가는",
  },
  fire: {
    dog: "좋아하는 사람 앞에서 표정과 몸짓이 먼저 살아나는",
    cat: "마음이 맞는 순간 짧고 선명하게 다가오는",
  },
  earth: {
    dog: "익숙한 루틴 안에서 마음이 단단해지는",
    cat: "자기 자리와 반복되는 시간을 소중히 여기는",
  },
  metal: {
    dog: "낯선 자극을 먼저 살피고 자기 기준으로 다가오는",
    cat: "거리와 분위기를 섬세하게 읽은 뒤 마음을 여는",
  },
  water: {
    dog: "보호자의 표정과 목소리를 조용히 읽어내는",
    cat: "조용히 관찰하다가 편안한 사람 곁에 머무는",
  },
};

function getSubject(petName?: string | null, species?: PetType) {
  const name = petName?.trim();

  if (name) {
    return postposition.topic(name);
  }

  return species === "cat" ? "우리 고양이는" : "우리 강아지는";
}

function selectKeyword(input: PetHookGeneratorInput) {
  const keywords = elementKeywords[input.dominantElement][input.species];
  const seed =
    input.scores[input.dominantElement] +
    input.scores[input.secondaryElement] +
    (input.birthTimeUnknown ? 1 : 0) +
    (input.adoptionDate ? 2 : 0);

  return keywords[seed % keywords.length];
}

function findCombinationHook(input: PetHookGeneratorInput) {
  const directKey =
    `${input.dominantElement}+${input.secondaryElement}` as `${FiveElement}+${FiveElement}`;
  const reversedKey =
    `${input.secondaryElement}+${input.dominantElement}` as `${FiveElement}+${FiveElement}`;

  return (
    combinationHooks[directKey]?.[input.species] ??
    combinationHooks[reversedKey]?.[input.species] ??
    null
  );
}

function createFallbackHook(input: PetHookGeneratorInput) {
  const keyword = selectKeyword(input);
  const phrase = `${elementLeadPhrases[input.dominantElement][input.species]} ${keyword}`;

  return {
    phrase,
    keyword,
    highlights: [keyword, elementLeadPhrases[input.dominantElement][input.species]],
  };
}

function softlyTrimSentence(sentence: string) {
  if (sentence.length <= 64) {
    return sentence;
  }

  return sentence
    .replace("온몸으로 다가오는", "다가오는")
    .replace("짧고 진하게 표현하는", "진하게 표현하는")
    .replace("가장 편안해지는", "편안해지는");
}

function createHookSentence(subject: string, phrase: string) {
  return `${subject} ${phrase.trim()}야.`
    .replace(/\s+야([.\s])/g, "야$1")
    .replace(/\s+/g, " ")
    .trim();
}

function createSubcopy(input: PetHookGeneratorInput) {
  const primaryLabel = getElementLabel(input.dominantElement);
  const secondaryLabel = getElementLabel(input.secondaryElement);
  const timeHint = input.birthTimeUnknown
    ? "태어난 시간을 모르는 경우에도 날짜의 흐름을 중심으로 살폈어요."
    : "태어난 시간의 결까지 함께 참고했어요.";
  const adoptionHint = input.adoptionDate
    ? "처음 만난 날의 기억도 관계의 리듬으로 함께 보았어요."
    : "생년월일의 흐름을 중심으로 읽었어요.";

  return `${primaryLabel}의 결이 가장 뚜렷하고, ${secondaryLabel}의 분위기가 곁을 받쳐줘요. ${timeHint} ${adoptionHint}`;
}

export function generatePetHook(input: PetHookGeneratorInput): PetHookResult {
  const hook = findCombinationHook(input) ?? createFallbackHook(input);
  const hookSentence = softlyTrimSentence(
    createHookSentence(getSubject(input.petName, input.species), hook.phrase),
  );
  const highlightWords = Array.from(
    new Set([...hook.highlights, `${hook.keyword}야.`, `${hook.keyword}야`]),
  ).slice(0, 4);

  return {
    hookSentence,
    hookKeyword: hook.keyword,
    hookSubcopy: createSubcopy(input),
    highlightWords,
  };
}

export function generatePetHookFromSajuInput(input: PetSajuInput): PetHookResult {
  const profile = calculatePetFiveElements(input);

  return generatePetHook({
    petName: input.name,
    species: input.type,
    dominantElement: profile.primaryElement,
    secondaryElement: profile.secondaryElement,
    scores: profile.scores,
    birthTimeUnknown: input.birthTimeUnknown,
    adoptionDate: input.adoptionDate,
  });
}
