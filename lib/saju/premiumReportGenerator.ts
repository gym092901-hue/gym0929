import {
  normalizePostpositionSpacing,
  postposition,
} from "@/lib/korean/postposition";
import {
  createLifestyleContextCopy,
  emptyLifestyleProfile,
} from "@/lib/readings/lifestyle";
import { sanitizeReportText } from "@/lib/reports/sanitizeReportText";
import {
  calculatePetFiveElements,
  getElementLabel,
  type FiveElement,
  type PetSajuInput,
} from "@/lib/saju/petSajuEngine";
import { generatePetHook } from "@/lib/saju/petHookGenerator";

type PremiumReportInput = PetSajuInput & {
  freeSummary: string;
};

const forbiddenTerms = [
  "죽음",
  "수명",
  "질병",
  "질환",
  "사고",
  "치료",
  "위험하다",
  "큰일",
  "불행",
  "부족",
  "결핍",
  "나쁨",
];

const elementLanguage: Record<
  FiveElement,
  {
    core: string;
    gift: string;
    sensitivity: string;
    love: string;
    routine: string;
    year: string;
  }
> = {
  wood: {
    core:
      "목의 기운은 새싹처럼 바깥을 향해 뻗어가는 힘이에요. 낯선 냄새, 새로운 길, 처음 만나는 장난감처럼 아직 확인하지 않은 것에서 마음이 살아나는 경향이 보여요.",
    gift:
      "새로운 상황을 자기만의 방식으로 탐색하고, 보호자와 함께 작은 발견을 쌓아가는 점이 큰 장점이에요.",
    sensitivity:
      "움직이고 살펴볼 시간이 너무 적거나, 궁금한 대상을 확인하기 전에 바로 멈춰야 하는 상황에서는 마음이 답답해질 수 있어요.",
    love:
      "같이 걷고, 같이 보며 보호자와 같은 리듬 안에서 애정을 키워가는 편이에요.",
    routine:
      "짧은 탐색 시간, 냄새 맡기, 창가 관찰, 새로운 장난감을 조금씩 소개하는 루틴이 잘 맞아요.",
    year:
      "올해는 작은 경험을 넓히기 좋은 흐름이에요. 새로운 것을 한꺼번에 밀어 넣기보다, 익숙한 일상 안에 작은 변화를 하나씩 더해보면 좋아요.",
  },
  fire: {
    core:
      "화의 기운은 마음을 밖으로 밝게 드러내는 힘이에요. 표정, 소리, 몸짓, 꼬리나 눈빛처럼 보호자가 알아차릴 수 있는 방식으로 존재감을 전하는 경향이 있어요.",
    gift:
      "분위기를 환하게 만들고, 보호자에게 자기 신호를 보여주며 교감의 온도를 높여주는 점이 큰 장점이에요.",
    sensitivity:
      "흥이 오른 뒤 갑자기 흐름이 끊기거나, 기대했던 반응이 돌아오지 않을 때는 조금 서운해하거나 들뜬 마음이 남을 수 있어요.",
    love:
      "보호자가 웃어주고 이름을 불러주고 짧게 칭찬해줄 때 사랑받는 느낌을 선명하게 기억하는 편이에요.",
    routine:
      "짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 더 안정적인 리듬이 됩니다.",
    year:
      "올해는 표현력이 조금 더 살아날 수 있는 흐름이에요. 신나는 경험과 조용히 쉬는 시간을 균형 있게 섞어주면 더 편안해질 수 있어요.",
  },
  earth: {
    core:
      "토의 기운은 중심을 잡고 편안한 자리를 만드는 힘이에요. 익숙한 공간, 같은 순서, 예측 가능한 하루 안에서 마음이 안정되는 경향이 보여요.",
    gift:
      "보호자의 곁을 든든하게 지키고, 반복되는 일상 속에서 관계를 깊게 만드는 점이 큰 장점이에요.",
    sensitivity:
      "생활 순서가 갑자기 바뀌거나, 쉬던 공간이 자주 달라지거나, 기다림의 기준이 흐려질 때 조금 불편해질 수 있어요.",
    love:
      "늘 하던 시간, 익숙한 목소리, 같은 자리에서 보호자를 확인하며 사랑을 느끼는 편이에요.",
    routine:
      "식사, 놀이 또는 휴식의 순서가 일정할수록 마음이 편안해져요.",
    year:
      "올해는 생활의 기준을 차분히 다듬기 좋은 흐름이에요. 반복되는 좋은 습관이 쌓일수록 신뢰가 더 단단해질 수 있어요.",
  },
  metal: {
    core:
      "금의 기운은 주변을 세심하게 살피고 자기 기준을 차분히 세우는 힘이에요. 소리, 거리감, 손길의 속도, 공간의 정돈감처럼 작은 차이를 잘 알아차리는 경향이 있어요.",
    gift:
      "자기만의 기준이 분명하고, 익숙해진 관계 안에서는 아주 깊고 섬세한 신뢰를 보여주는 점이 장점이에요.",
    sensitivity:
      "갑작스러운 접촉, 큰 소리, 낯선 존재가 빠르게 다가오는 흐름에서는 먼저 거리를 두고 싶어질 수 있어요.",
    love:
      "기다려주는 보호자, 예고해주는 손길, 반복되는 약속을 통해 마음을 여는 편이에요.",
    routine:
      "깔끔한 휴식 자리, 일정한 동선, 예고 후 스킨십, 짧고 반복적인 놀이가 잘 맞아요.",
    year:
      "올해는 기준과 약속을 안정적으로 세우기 좋은 흐름이에요. 작은 규칙이 반복되면 마음의 여유가 더 커질 수 있어요.",
  },
  water: {
    core:
      "수의 기운은 조용히 관찰하고 천천히 마음을 여는 힘이에요. 바로 뛰어들기보다 먼저 지켜보고, 충분히 이해한 뒤 움직이는 경향이 보여요.",
    gift:
      "분위기를 섬세하게 읽고, 보호자의 감정 변화를 조용히 알아차리는 점이 큰 장점이에요.",
    sensitivity:
      "계속 표현을 요구받거나, 쉴 틈 없이 자극이 이어지거나, 조용히 살펴볼 시간이 짧으면 부담을 느낄 수 있어요.",
    love:
      "크게 드러내기보다 곁에 머물고, 조용히 따라오고, 보호자의 가까운 자리를 선택하며 마음을 표현하는 편이에요.",
    routine:
      "조용한 휴식 공간, 느린 놀이, 낮은 목소리의 칭찬, 충분한 관찰 시간이 잘 맞아요.",
    year:
      "올해는 마음의 속도를 존중할수록 좋은 흐름이에요. 충분히 쉬고 살핀 뒤 움직이면 새로운 경험도 더 편안하게 받아들일 수 있어요.",
  },
};

const months = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

const elementMonthlyFocus: Record<FiveElement, string> = {
  wood: "새로운 냄새나 장난감은 한 번에 많이 늘리기보다 하나씩 소개해보세요.",
  fire: "신나는 반응 뒤에는 짧은 칭찬과 차분한 마무리를 붙여보세요.",
  earth: "익숙한 순서가 무너지지 않도록 식사, 놀이, 휴식의 흐름을 일정하게 잡아보세요.",
  metal: "낯선 자극은 거리와 속도를 조절하며 천천히 확인하게 해주세요.",
  water: "충분히 관찰하고 쉬는 시간을 먼저 마련한 뒤 새 경험을 더해보세요.",
};

const dogMonthlyChecklist = [
  "실내 루틴을 다시 맞추기 좋은 달이에요. 추운 날 산책은 짧게 나누고, 돌아온 뒤 같은 자리에서 물과 휴식을 이어주세요.",
  "추운 날에는 출발 전 준비 신호를 천천히 주세요. 익숙한 길을 짧게 걷고, 집 안 노즈워크로 탐색 에너지를 부드럽게 풀어보세요.",
  "새로운 냄새가 늘어나는 시기예요. 산책길에서 한 군데만 새 코스를 더하고, 아이가 멈춰 맡는 시간을 체크해보세요.",
  "산책 환경 변화가 많아질 수 있어요. 사람이나 소리가 많은 곳에서는 보호자의 목소리 신호를 먼저 들려주고 여유 있게 지나가보세요.",
  "활동량이 자연스럽게 올라가는 달이에요. 산책을 길게 한 번 하기보다 걷기, 냄새 맡기, 쉬기를 작은 묶음으로 나눠보세요.",
  "놀이와 휴식의 균형을 살피기 좋아요. 신나게 움직인 뒤에는 조용한 마무리 시간을 정해 몸과 마음이 천천히 가라앉게 해주세요.",
  "더위가 느껴지는 시기에는 실내 놀이 비중을 늘려보세요. 짧은 노즈워크와 시원한 휴식 자리를 번갈아 주면 리듬이 편안해져요.",
  "바깥 활동은 무리하게 늘리기보다 시간대를 살펴 조절해보세요. 집 안에서는 숨겨둔 간식 찾기처럼 짧고 집중되는 놀이가 잘 맞아요.",
  "산책 리듬을 다시 회복하기 좋은 달이에요. 익숙한 코스를 먼저 안정적으로 걷고, 새로운 냄새 지점은 한두 곳만 더해보세요.",
  "새로운 자극을 받아들이기 좋은 계절이에요. 낯선 길보다 익숙한 길의 작은 변화를 보여주며 반응을 기록해보세요.",
  "한 해의 생활 습관을 차분히 정리해보세요. 산책 전 신호, 귀가 후 휴식, 식사 전 기다림처럼 잘 맞았던 약속을 남겨두면 좋아요.",
  "따뜻한 루틴이 중요한 달이에요. 짧은 산책과 실내 휴식을 부드럽게 이어주고, 좋아했던 놀이를 한두 가지로 정리해보세요.",
];

const catMonthlyChecklist = [
  "실내 루틴을 다시 맞추기 좋은 달이에요. 창가 자리, 담요, 놀이 시간을 일정하게 두고 아이가 편히 머무는 위치를 살펴보세요.",
  "추운 날에는 집 안 활동의 시작 신호를 부드럽게 주세요. 짧은 사냥 놀이와 햇빛 드는 휴식 자리를 번갈아 마련해보세요.",
  "새로운 냄새와 소리가 늘어나는 시기예요. 창문 근처 관찰 시간을 짧게 열어두고, 낯선 물건은 바닥에 두어 스스로 확인하게 해주세요.",
  "집 안 동선 변화에 대한 반응을 보기 좋아요. 새 방석이나 박스는 자주 쉬는 자리에서 조금 떨어진 곳에 놓고 천천히 익숙하게 해주세요.",
  "활동량과 호기심이 살아날 수 있어요. 낚싯대 놀이를 짧게 여러 번 나누고, 끝난 뒤에는 조용한 정리 시간을 붙여보세요.",
  "놀이와 휴식의 균형을 살피기 좋은 달이에요. 사냥 놀이 뒤 먹는 자리나 쉬는 자리로 자연스럽게 이어지는 흐름을 만들어보세요.",
  "더위가 느껴지는 시기에는 실내 놀이를 짧고 가볍게 가져가세요. 시원한 바닥, 그늘진 자리, 조용한 숨숨집을 선택할 수 있게 해주세요.",
  "긴 놀이보다 짧은 집중 놀이가 잘 맞을 수 있어요. 장난감을 바꿀 때는 하나씩 꺼내 움직임을 살피고, 쉬는 시간을 충분히 남겨주세요.",
  "놀이 리듬을 다시 회복하기 좋은 달이에요. 같은 시간대에 짧은 사냥 놀이를 열어주고, 좋아하는 이동 경로를 관찰해보세요.",
  "새로운 자극을 천천히 더하기 좋아요. 낯선 장난감이나 박스는 냄새를 맡고 지나갈 시간을 주며 머무는 위치를 기록해보세요.",
  "안정과 정리가 중요한 시기예요. 자주 쓰는 자리, 밥 자리, 화장실 주변 동선을 깔끔하게 유지하고 좋아하는 루틴을 남겨보세요.",
  "따뜻한 루틴으로 한 해를 마무리해보세요. 창가 관찰, 짧은 놀이, 조용한 휴식을 일정한 순서로 이어주면 편안함이 커져요.",
];

const repeatedElementPrefixPattern = /(목|화|토|금|수)의 기운은\s+\1의 기운은/g;
const duplicateSentenceMinLength = 24;
const elementPrefixPattern = /^[목화토금수]의 기운은\s*/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function speciesLabel(type: PetSajuInput["type"]) {
  return type === "dog" ? "강아지" : "고양이";
}

function speciesWorld(type: PetSajuInput["type"]) {
  if (type === "dog") {
    return {
      movement: "산책길의 냄새, 보호자의 발걸음, 문밖의 소리",
      social: "낯선 사람을 만났을 때 보호자의 반응을 먼저 확인하는 모습",
      play: "산책, 노즈워크, 짧은 부름 놀이",
      rest: "산책 뒤 물을 마시고 익숙한 자리에서 쉬는 시간",
      greeting:
        "꼬리와 몸의 방향, 눈맞춤, 가까이 와서 머무는 행동으로 마음을 표현할 수 있어요.",
    };
  }

  return {
    movement: "창밖 풍경, 집 안의 동선, 자기만의 높은 자리와 숨숨집",
    social: "낯선 사람이 왔을 때 바로 다가가기보다 거리를 두고 관찰하는 모습",
    play: "낚싯대 놀이, 짧은 사냥 놀이, 조용한 탐색",
    rest: "놀이 뒤 몸을 정리하고 익숙한 자리에서 길게 쉬는 시간",
    greeting:
      "천천히 다가오기, 같은 방에 머물기, 눈을 느리게 깜빡이기처럼 조용한 방식으로 마음을 표현할 수 있어요.",
    };
}

function elementBalanceText(primaryLabel: string, secondaryLabel: string) {
  return `${primaryLabel}의 흐름이 가장 또렷하게 보이고, ${secondaryLabel}의 기운이 그 옆에서 행동의 색을 부드럽게 더해주는 조합입니다. 나머지 오행은 우열로 나누기보다 상황에 따라 보완하면 좋은 생활 언어로 보면 좋아요.`;
}

function elementCoreFragment(sentence: string) {
  return sentence
    .replace(elementPrefixPattern, "")
    .replace(/\s+/g, " ")
    .trim();
}

function elementYearFragment(sentence: string) {
  return sentence
    .replace(/^올해는\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function monthlyAdvice(name: string, type: PetSajuInput["type"], primary: FiveElement) {
  const namePossessive = postposition.possessive(name);
  const checklist =
    type === "dog" ? dogMonthlyChecklist : catMonthlyChecklist;
  const focus = elementMonthlyFocus[primary];

  return months
    .map((month, index) => {
      const baseAdvice = checklist[index];
      const focusAdvice =
        index % 4 === 0
          ? ` ${namePossessive} 기질을 살리려면 ${focus}`
          : "";

      return `${month}: ${baseAdvice}${focusAdvice}`;
    })
    .join("\n");
}

function safeAssert(report: string, petName: string) {
  const matchedTerm = forbiddenTerms.find((term) => report.includes(term));

  if (matchedTerm) {
    throw new Error(`Premium report contains a forbidden expression: ${matchedTerm}`);
  }

  const escapedName = escapeRegExp(petName.trim());
  const forbiddenPatterns = [
    {
      label: `${petName} 의`,
      pattern: new RegExp(`${escapedName}\\s+의`),
    },
    {
      label: `${petName} 이`,
      pattern: new RegExp(`${escapedName}\\s+이(?=\\s|[,.!?]|$)`),
    },
    {
      label: ["기운은 ", "기운은"].join(""),
      pattern: /기운은\s+기운은/,
    },
    {
      label: ["잘 맞아요", ".도"].join(""),
      pattern: /잘 맞아요\.도/,
    },
    {
      label: ".도 잘 맞습니다",
      pattern: /\.도\s+잘 맞습니다/,
    },
    {
      label: "올해는 올해는",
      pattern: /올해는\s+올해는/,
    },
    {
      label: ["낯선 자극을 만났을 때는 ", "금의 기운은"].join(""),
      pattern: /낯선 자극을 만났을 때는\s+[목화토금수]의 기운은/,
    },
    {
      label: ["금의 기운은 ", "기준을 세우고"].join(""),
      pattern: new RegExp(["금의 기운은 ", "기준을 세우고"].join("")),
    },
    {
      label: ["화의 기운은 ", "올해는"].join(""),
      pattern: /[목화토금수]의 기운은\s+올해는/,
    },
    {
      label: ["이런 방향을 ", "함께 보여줘요"].join(""),
      pattern: new RegExp(["이런 방향을 ", "함께 보여줘요"].join("")),
    },
  ];
  const matchedPattern = forbiddenPatterns.find(({ pattern }) =>
    pattern.test(report),
  );

  if (matchedPattern) {
    throw new Error(
      `Premium report contains a forbidden pattern: ${matchedPattern.label}`,
    );
  }
}

function normalizeSentence(sentence: string) {
  return sentence.replace(/\s+/g, " ").trim();
}

function fixNameSpacing(report: string, petName: string) {
  return normalizePostpositionSpacing(report, petName);
}

function normalizeAwkwardPatterns(report: string, petName: string) {
  const nameTopic = postposition.topic(petName);
  const namePossessive = postposition.possessive(petName);
  const nameTo = postposition.to(petName);

  return fixNameSpacing(report, petName)
    .replace(/[ \t]{2,}/g, " ")
    .replace(repeatedElementPrefixPattern, "$1의 기운은")
    .replace(/기운은\s+기운은/g, "기운은")
    .replace(
      /잘 맞아요\.도\s*잘 맞습니다\.?/g,
      `짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 ${nameTo} 더 안정적인 리듬이 됩니다.`,
    )
    .replace(
      /잘 맞아요\.도/g,
      `짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 ${nameTo} 더 안정적인 리듬이 됩니다.`,
    )
    .replace(/올해는\s+올해는/g, "올해는")
    .replace(
      /[목화토금수]의 기운은\s+올해는[^.]*\.?/g,
      `올해는 ${namePossessive} 표현력이 조금 더 살아날 수 있는 흐름이에요.`,
    )
    .replace(
      /낯선 자극을 만났을 때는\s+[목화토금수]의 기운은[^.]*\.?/g,
      `낯선 자극을 만났을 때 ${nameTopic} 먼저 거리와 분위기를 확인하려는 경향이 있어요.`,
    )
    .replace(
      /낯선 자극 앞에서는\s+[목화토금수]\s*기운이\s+[^.]*\.?/g,
      `낯선 자극을 만났을 때 ${nameTopic} 먼저 거리와 분위기를 확인하려는 경향이 있어요.`,
    )
    .replace(
      new RegExp(`${["금의 기운은 ", "기준을 세우고"].join("")}[^.]*\\.?`, "g"),
      "금의 기운은 주변을 세심하게 살피고 자기 기준을 차분히 세우는 힘이에요.",
    )
    .replace(new RegExp(["이런 방향을 ", "함께 보여줘요", "\\.?"].join(""), "g"), "")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".");
}

function removeRepeatedSentences(report: string) {
  const seenSentences = new Set<string>();
  const repeatedSentences = new Map<string, number>();
  const sentences = report.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [report];

  const cleanedReport = sentences
    .map((sentence) => {
      const key = normalizeSentence(sentence);

      if (key.length < duplicateSentenceMinLength) {
        return sentence;
      }

      if (seenSentences.has(key)) {
        repeatedSentences.set(key, (repeatedSentences.get(key) ?? 1) + 1);
        return "";
      }

      seenSentences.add(key);
      return sentence;
    })
    .join("")
    .trim();

  if (repeatedSentences.size > 0) {
    console.warn("Premium report contains repeated sentences; duplicates were removed.", {
      repeatedSentences: Array.from(repeatedSentences, ([sentence, count]) => ({
        sentence,
        count,
      })),
    });
  }

  return cleanedReport;
}

export function sanitizePremiumReport(report: string, petName: string) {
  return sanitizeReportText(
    removeRepeatedSentences(normalizeAwkwardPatterns(report, petName)),
    {
      context: "premium_report",
      petName,
    },
  );
}

function createFreeSummaryBridge(freeSummary: string) {
  const normalizedSummary = freeSummary.replace(/\s+/g, " ").trim();
  const focus = /루틴|생활|애착|교감/.test(normalizedSummary)
    ? "생활 리듬과 애착 신호를"
    : "첫인상과 기질 흐름을";

  return `무료 결과에서 보였던 흐름을 더 깊게 보면, ${focus} 한 번 더 넓게 살펴볼 수 있어요.`;
}

export function generatePremiumReport(input: PremiumReportInput) {
  const profile = calculatePetFiveElements(input);
  const primary = profile.primaryElement;
  const secondary = profile.secondaryElement;
  const hook = generatePetHook({
    petName: input.name,
    species: input.type,
    dominantElement: primary,
    secondaryElement: secondary,
    scores: profile.scores,
    birthTimeUnknown: input.birthTimeUnknown,
    adoptionDate: input.adoptionDate,
  });
  const primaryLabel = getElementLabel(primary);
  const secondaryLabel = getElementLabel(secondary);
  const primaryText = elementLanguage[primary];
  const secondaryText = elementLanguage[secondary];
  const primaryCore = elementCoreFragment(primaryText.core);
  const secondaryCore = elementCoreFragment(secondaryText.core);
  const secondaryYear = elementYearFragment(secondaryText.year);
  const petKind = speciesLabel(input.type);
  const world = speciesWorld(input.type);
  const lifestyleCopy = createLifestyleContextCopy(
    input.lifestyle ?? emptyLifestyleProfile,
    input.type,
  );
  const basisLabel =
    profile.calculationBasis === "birth_date" ? "생년월일" : "입양일";
  const timeNote = input.birthTimeUnknown
    ? "태어난 시간은 모름으로 두고, 날짜와 입양일의 흐름을 중심으로 부드럽게 살폈어요."
    : input.birthTime
      ? `태어난 시간 ${input.birthTime}은 세부 분위기를 읽는 보조 단서로만 참고했어요.`
      : "태어난 시간은 비워져 있어 날짜의 큰 흐름을 중심으로 살폈어요.";
  const freeSummaryBridge = createFreeSummaryBridge(input.freeSummary);
  const nameTopic = postposition.topic(input.name);
  const nameSubject = postposition.subject(input.name);
  const nameObject = postposition.object(input.name);
  const namePossessive = postposition.possessive(input.name);
  const nameTo = postposition.to(input.name);
  const personalityExamples =
    input.type === "cat"
      ? `예를 들어 평소보다 오래 같은 방에 머무르거나, 캣타워에서 보호자를 내려다보다가 조용히 내려와 근처에 앉거나, 느린 눈맞춤을 보내는 모습은 모두 ${nameSubject} 자기 방식으로 신뢰를 표현하는 장면일 수 있습니다.`
      : `예를 들어 평소보다 조금 더 가까운 자리를 고르거나, 부르면 한 박자 늦게라도 돌아보거나, 놀이가 끝난 뒤 보호자 주변에 머무는 모습은 모두 ${nameSubject} 자기 방식으로 신뢰를 표현하는 장면일 수 있습니다.`;
  const sensitivityResponse =
    input.type === "cat"
      ? `이런 상황에서도 숨숨집으로 이동하거나, 캣타워 위에서 거리를 재거나, 꼬리 끝을 작게 움직이며 분위기를 확인하는 모습이 나타날 수 있어요.`
      : `이런 상황에서도 잠깐 멈추거나, 고개를 돌리거나, 보호자의 반응을 먼저 보는 모습이 나타날 수 있어요.`;
  const sensitivitySignals =
    input.type === "cat"
      ? `${nameTopic} 불편함을 말로 설명하지 못하니까 귀의 방향, 꼬리 움직임, 몸을 낮추는 정도, 숨는 위치, 시선의 길이로 자기 마음을 알려줄 수 있어요.`
      : `${nameTopic} 불편함을 말로 설명하지 못하니까 몸의 방향, 숨는 위치, 꼬리나 귀의 작은 변화, 시선의 움직임으로 자기 마음을 알려줄 수 있어요.`;
  const loveExamples =
    input.type === "cat"
      ? `조용히 같은 방에 머무르거나, 보호자가 움직일 때 눈만 천천히 따라가거나, 먼저 다가와 짧게 몸을 스치고 자기 자리로 돌아가는 것도 충분히 애정 표현일 수 있어요.`
      : `조용히 곁에 눕거나, 보호자가 움직일 때 시선만 따라가거나, 놀이가 끝난 뒤 같은 공간에 머무르는 것도 충분히 애정 표현일 수 있어요.`;
  const loveGuidance =
    input.type === "cat"
      ? `손을 먼저 뻗기보다 ${nameSubject} 먼저 다가올 때까지 기다리고, 느린 눈맞춤과 낮은 목소리로 곁을 지켜주면 보호자는 ${nameTo} 아주 믿을 만한 기준점이 됩니다.`
      : `이름을 부르는 톤, 칭찬의 말, 다가가는 속도를 일정하게 해주면 보호자는 ${nameTo} 아주 믿을 만한 기준점이 됩니다.`;
  const strangerGuidance =
    input.type === "cat"
      ? `낯선 사람에게 바로 손을 내밀게 하기보다, ${nameSubject} 캣타워나 숨숨집처럼 물러날 수 있는 자리를 먼저 확인하게 해주세요. 낯선 공간에서는 도착하자마자 탐색을 재촉하기보다 물, 화장실 위치, 자기 냄새가 묻은 담요, 보호자가 앉아 있는 위치처럼 기본 단서를 먼저 알려주는 것이 좋아요.`
      : `낯선 사람에게 바로 만지게 하기보다, ${nameSubject} 먼저 냄새를 맡거나 바라볼 시간을 주세요. 낯선 공간에서는 도착하자마자 많은 것을 시키기보다 물, 자리, 보호자의 위치처럼 기본 단서를 먼저 알려주는 것이 좋아요.`;
  const routineTitle =
    input.type === "cat"
      ? "사냥놀이/관찰/휴식 루틴 조언"
      : "산책/놀이/휴식 루틴 조언";
  const routineSpecific =
    input.type === "cat"
      ? "놀이 전에는 장난감을 갑자기 들이밀기보다 바닥을 따라 천천히 움직이며 시선을 끌어주세요. 짧은 사냥놀이가 끝난 뒤에는 식사나 간식, 그다음 자기 자리나 숨숨집에서 쉬는 흐름으로 이어지면 좋아요. 캣타워, 창가, 물그릇, 화장실 동선은 자주 바꾸지 않는 편이 안정적입니다."
      : "산책 전에는 같은 말이나 하네스 준비 순서를 쓰고, 산책 중에는 냄새 맡는 시간을 조금 남겨주세요. 집에 돌아온 뒤에는 물을 마시고 조용히 쉬는 마무리까지 이어지면 좋아요.";
  const yearlyExample =
    input.type === "cat"
      ? "예를 들어 창밖 관찰 시간을 일정하게 두거나, 짧은 사냥놀이 시간을 하루 두세 번으로 나누거나, 숨숨집 근처에 편안한 담요를 하나 더해주는 식이 좋아요."
      : "예를 들어 산책 코스나 놀이 시간을 완전히 바꾸기보다, 기존 루틴에 새로운 냄새 맡기 장소 하나를 더하거나, 쉬는 자리 근처에 편안한 담요를 하나 추가하는 식이 좋아요.";
  const monthlyRecordExample =
    input.type === "cat"
      ? `“오늘은 창가에서 오래 쉬었다”, “새 장난감을 바로 잡기보다 냄새만 맡고 지나갔다”, “짧은 사냥놀이 뒤에 숨숨집에서 편안히 쉬었다” 같은 한 줄이면 충분해요.`
      : `“오늘은 창가에서 오래 쉬었다”, “낯선 소리에 잠깐 멈췄지만 금방 돌아왔다”, “짧은 놀이 뒤에 더 편안해 보였다” 같은 한 줄이면 충분해요.`;
  const finalSignalExamples =
    input.type === "cat"
      ? "느린 눈맞춤, 꼬리의 작은 움직임, 자기 자리에서 보호자를 바라보는 시간, 먼저 다가왔다가 다시 물러나는 속도"
      : "눈빛, 몸의 방향, 다가오는 거리, 쉬는 자리, 놀이를 시작하고 끝내는 속도";
  const lifestyleOverview = lifestyleCopy.hasLifestyle
    ? input.type === "cat"
      ? `보호자가 알려준 생활 모습까지 함께 보면 ${lifestyleCopy.favoriteLabels.length ? `${lifestyleCopy.favoriteLabels.join(", ")} 같은 활동` : "실내 리듬"}과 ${lifestyleCopy.distanceLabel ? `보호자와의 ${lifestyleCopy.distanceLabel} 거리감` : "거리 조절 방식"}이 ${namePossessive} 해석을 더 구체적으로 만들어줍니다.`
      : `보호자가 알려준 생활 모습까지 함께 보면 ${lifestyleCopy.favoriteLabels.length ? `${lifestyleCopy.favoriteLabels.join(", ")} 같은 활동` : "산책과 놀이 리듬"}과 ${lifestyleCopy.distanceLabel ? `보호자와의 ${lifestyleCopy.distanceLabel} 거리감` : "보호자 반응을 살피는 방식"}이 ${namePossessive} 해석을 더 구체적으로 만들어줍니다.`
    : "";
  const strangerPersonalization = lifestyleCopy.strangerCopy
    ? `입력한 낯선 사람 반응은 ${lifestyleCopy.strangerCopy}으로 읽혀요. 그래서 새로운 사람이나 공간을 만날 때는 반응을 재촉하기보다 ${input.type === "cat" ? "자기 자리, 캣타워, 숨숨집처럼 물러날 수 있는 선택지" : "보호자 곁, 하네스 신호, 냄새를 확인할 시간"}을 먼저 마련해주는 편이 좋습니다.`
    : "";
  const routinePersonalization = lifestyleCopy.hasLifestyle
    ? `${lifestyleCopy.activityCopy} ${
        lifestyleCopy.favoriteLabels.length
          ? `${lifestyleCopy.favoriteLabels.join(", ")}을 좋아한다는 점도 루틴을 고를 때 중요한 단서예요.`
          : ""
      } ${
        lifestyleCopy.aloneLabel
          ? `혼자 있는 시간이 ${lifestyleCopy.aloneLabel} 정도라면 귀가 후 반복 인사와 짧은 교감 시간을 붙여 하루 전환을 부드럽게 만들어보세요.`
          : ""
      }`
    : "";
  const questionPersonalization = lifestyleCopy.questionLabels.length
    ? `보호자가 특히 궁금해한 ${lifestyleCopy.questionLabels.join(", ")}은 이번 리포트의 실천 조언을 고르는 기준으로 함께 반영했어요.`
    : "";

  const sections = [
    `1. ${namePossessive} 사주 한 장 요약
${hook.hookSentence}
${hook.hookSubcopy}

${nameTopic} ${primaryLabel}의 기운이 앞에 서고 ${secondaryLabel}의 기운이 곁에서 받쳐주는 ${petKind}로 읽혀요. 이 조합은 ${nameSubject} 세상을 받아들이는 속도와 보호자에게 마음을 표현하는 방식이 한 가지로만 고정되어 있지 않다는 뜻이에요. ${primaryText.core} ${secondaryText.core} 이 두 기운이 함께 흐르면 ${nameTopic} 어떤 날에는 밝게 다가오고, 어떤 날에는 조금 더 살피고 기다리는 모습을 보일 수 있어요. ${lifestyleOverview} ${freeSummaryBridge} 이 심층 리포트는 그런 결을 더 자세히 풀어 보호자가 ${nameObject} 더 편안하게 이해하도록 돕는 글입니다. ${timeNote}`,

    `2. 타고난 오행 기질
${basisLabel}을 기준으로 간단히 살핀 ${namePossessive} 오행 흐름은 숫자로 평가하기보다 행동 언어로 읽는 편이 더 다정합니다. ${elementBalanceText(primaryLabel, secondaryLabel)} 오행은 보호자가 아이를 평가하는 도구가 아니라, 아이가 어떤 방식으로 안정감을 느끼고 어떤 자극에 마음이 열리는지 살피는 언어에 가깝습니다. ${primaryText.core} ${secondaryText.core} 이 두 기운이 함께 있을 때 ${nameTopic} ${world.movement} 같은 일상의 단서에 민감하게 반응하면서도, 보호자의 분위기를 통해 다시 자기 자리를 찾아가려는 경향이 보여요. 특히 ${petKind}의 생활에서는 몸으로 표현되는 신호가 중요합니다. 가까이 오는 거리, 시선의 길이, 머무는 자리, 놀이 후 쉬는 방식 같은 작은 장면을 보면 ${namePossessive} 오행 기질이 훨씬 자연스럽게 보일 수 있어요.`,

    `3. 성격의 장점
${namePossessive} 가장 예쁜 장점은 자기만의 속도로 관계를 쌓아간다는 점이에요. ${primaryText.gift} ${secondaryLabel}의 기운까지 함께 보면 ${secondaryText.gift} 이런 모습도 자연스럽게 섞여요. 보호자가 보기에는 아주 작은 변화처럼 보여도, ${nameTo}는 큰 의미가 있는 행동일 수 있어요. ${personalityExamples} 너무 빠른 기대보다 작은 신호를 알아봐주는 보호자와 함께 있을 때 ${namePossessive} 장점은 더 또렷하게 살아나요. 이 아이는 보호자를 기쁘게 하려고 무리해서 맞추기보다, 편안하다고 느끼는 순간에 가장 자기다운 사랑스러움을 보여주는 경향이 있어요.`,

    `4. 예민해지기 쉬운 상황
${nameSubject} 예민해지는 순간은 대개 마음의 준비보다 자극이 먼저 들어올 때예요. ${primaryText.sensitivity} 여기에 ${secondaryLabel}의 결이 더해지면 ${secondaryText.sensitivity} ${sensitivityResponse} ${strangerPersonalization} 이것을 고집이나 문제로만 보기보다 “지금 이 아이가 무엇을 확인하고 싶어 할까?”라고 바라봐주면 훨씬 다정한 해석이 됩니다. ${sensitivitySignals} 보호자는 그 신호를 발견했을 때 바로 더 큰 자극을 주기보다, 한 걸음 물러나고 익숙한 목소리로 짧게 안내해주는 편이 좋아요. 무조건 피하게 하기보다 안전한 거리에서 살필 시간을 주면, ${nameTopic} 자기 속도로 다시 편안함을 찾을 수 있어요.`,

    `5. 보호자에게 사랑을 표현하는 방식
${nameSubject} 보호자에게 사랑을 표현하는 방식은 ${petKind}다운 몸짓 안에 숨어 있을 때가 많아요. ${world.greeting} ${primaryText.love} ${secondaryLabel}의 기운은 또 ${secondaryText.love} 이런 식으로 애착을 더 섬세하게 만들어줍니다. 그래서 ${nameSubject} 늘 크게 반응하지 않더라도 마음이 없는 것은 아니에요. ${loveExamples} 보호자가 해야 할 일은 표현의 크기를 재는 것이 아니라 반복되는 신호를 기억하는 것입니다. ${lifestyleCopy.distanceLabel ? `입력한 거리감이 “${lifestyleCopy.distanceLabel}”에 가깝다면, 그 거리 자체를 애정의 온도로 읽어주는 태도도 필요해요.` : ""} ${nameTopic} “늘 같은 방식으로 나를 알아봐주는 사람”에게 더 깊은 안정감을 느끼는 경향이 있어요. ${loveGuidance}`,

    `6. 낯선 사람과 공간에 대한 반응
낯선 자극을 만났을 때 ${nameTopic} 먼저 거리와 분위기를 확인하려는 경향이 있어요. ${world.social}이 대표적인 모습일 수 있습니다. ${primaryLabel}의 흐름은 ${primaryCore} ${secondaryLabel}의 흐름은 ${secondaryCore} 이 두 결이 함께 더해져 ${nameSubject} 갑자기 밀려오는 자극보다 천천히 확인할 수 있는 환경에서 더 편안해질 수 있어요. 강하게 밀어붙이면 ${nameTopic} 마음을 닫기보다 잠깐 멈추고 확인하려 할 수 있어요. 이때 보호자가 “괜찮아, 천천히 보자”는 분위기를 만들어주면 좋습니다. ${strangerGuidance} ${nameTopic} 새로운 것을 싫어한다기보다, 새로움을 자기 안에 넣는 데 시간이 필요한 타입일 수 있어요.`,

    `7. ${routineTitle}
${nameTo} 잘 맞는 루틴은 활동과 휴식을 분리하지 않고 하나의 흐름으로 이어주는 방식이에요. ${primaryText.routine} ${secondaryLabel}의 결에서는 ${secondaryText.routine} 두 리듬을 번갈아 살피면 놀이 뒤 흥분이 오래 남지 않고, 휴식으로 넘어가는 과정도 더 부드러워질 수 있어요. ${petKind}에게 루틴은 단순한 반복이 아니라 마음을 놓을 수 있는 약속이에요. ${routineSpecific} ${routinePersonalization} 놀이도 길게 한 번보다 짧게 여러 번이 더 잘 맞을 수 있어요. 휴식은 보상처럼 주는 시간이 아니라, ${nameSubject} 하루를 정리하는 중요한 리듬입니다. 보호자가 이 리듬을 존중해주면 ${nameTopic} 더 편안한 얼굴로 일상을 받아들일 수 있어요.`,

    `8. 올해의 전체 흐름
올해 ${nameTo} 중요한 흐름은 “작게 반복하고, 천천히 넓히기”입니다. 올해는 ${namePossessive} 표현력이 조금 더 살아날 수 있는 흐름이에요. ${secondaryLabel}의 흐름에서는 ${secondaryYear} 두 기운을 함께 보면 큰 변화를 한 번에 만드는 것보다, 이미 익숙한 생활 안에서 좋은 습관을 조금씩 강화하는 편이 잘 맞습니다. ${yearlyExample} ${nameTopic} 보호자의 조급함보다 안정적인 반복에 더 잘 반응할 수 있습니다. 올해의 포인트는 성과가 아니라 편안함이에요. 보호자가 ${namePossessive} 작은 신호를 기록하고, 잘 맞았던 환경을 기억해두면 일상의 만족감이 더 커질 수 있어요. 이 흐름은 보호자와 ${nameSubject} 서로의 속도를 더 잘 맞춰가는 시간으로 읽힙니다.`,

    `9. 월별 조언
${monthlyAdvice(input.name, input.type, primary)}
월별 조언은 운명을 정해놓는 달력이 아니라, 보호자가 한 달씩 생활을 돌아볼 수 있도록 만든 작은 체크리스트에 가까워요. ${questionPersonalization} ${nameSubject} 좋아했던 놀이, 조금 불편해했던 상황, 편안하게 머물렀던 휴식 공간을 짧게 메모해보세요. 몇 달이 지나면 ${namePossessive} 패턴이 훨씬 선명하게 보일 거예요. 이 기록은 거창할 필요가 없습니다. ${monthlyRecordExample} ${nameTopic} 보호자가 이렇게 자기 신호를 알아봐주는 것만으로도 더 안정된 일상을 경험할 수 있습니다.`,

    `10. 보호자에게 전하는 메시지
${nameObject} 가장 잘 이해하는 방법은 빠르게 결론을 내리는 것이 아니라, 반복되는 작은 장면을 오래 바라보는 것입니다. ${nameTopic} 이미 보호자에게 많은 이야기를 하고 있어요. 다만 그 이야기가 말이 아니라 ${finalSignalExamples}로 표현될 뿐입니다. 보호자가 그 신호를 알아봐주면 ${nameTopic} “내가 이해받고 있구나”라는 안정감을 조금씩 쌓아갈 수 있어요. 너무 완벽한 보호자가 되려고 애쓰지 않아도 괜찮습니다. 같은 목소리로 불러주고, 기다려주고, 성공한 순간에 작게 칭찬해주는 것만으로도 ${nameTo}는 충분히 따뜻한 기준이 됩니다. 이 리포트는 불안을 만들기 위한 글이 아니라, 보호자가 ${nameObject} 더 다정하게 바라볼 수 있도록 돕는 안내서입니다. 오늘도 ${nameTopic} 자기만의 방식으로 보호자를 믿고, 확인하고, 곁에 머물고 있을 가능성이 커요. 그 마음을 천천히 받아주세요.`,
  ];

  const report = sanitizePremiumReport(sections.join("\n\n"), input.name);
  safeAssert(report, input.name);

  if (report.length < 5000) {
    throw new Error("Premium report must be at least 5000 characters.");
  }

  return {
    report,
    profile,
  };
}
