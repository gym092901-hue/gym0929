import {
  calculatePetFiveElements,
  getElementLabel,
  type FiveElement,
  type PetSajuInput,
} from "@/lib/saju/petSajuEngine";

const forbiddenTerms = ["질병", "죽음", "사고", "수명"];

const elementDetails: Record<
  FiveElement,
  {
    nature: string;
    attachment: string;
    tension: string;
    routine: string;
    yearFlow: string;
  }
> = {
  wood: {
    nature:
      "목의 결은 바깥을 향해 뻗는 힘입니다. 새로운 냄새, 낯선 길, 처음 보는 장난감처럼 아직 확인하지 않은 자극을 통해 마음이 열립니다. 다만 속도를 너무 빠르게 몰아가면 흥미보다 부담을 먼저 느낄 수 있어 천천히 살피는 시간이 필요합니다.",
    attachment:
      "보호자와 함께 무언가를 발견할 때 애착이 깊어집니다. 이름을 불러주고, 함께 걷고, 작은 선택을 허락해주는 순간에 관계가 자랍니다.",
    tension:
      "답답하게 막힌 공간, 탐색 없이 바로 멈춰야 하는 상황, 낯선 자극이 한꺼번에 몰려오는 흐름에서 긴장하기 쉽습니다.",
    routine:
      "짧은 탐색 산책, 냄새 맡기, 창가 관찰, 새로운 장난감을 조금씩 보여주는 방식이 잘 맞습니다.",
    yearFlow:
      "올해는 새로운 습관을 만들기 좋은 흐름입니다. 한 번에 큰 변화를 주기보다 작은 경험을 꾸준히 쌓을수록 자신감이 살아납니다.",
  },
  fire: {
    nature:
      "화의 결은 마음을 밖으로 드러내는 힘입니다. 표정, 소리, 몸짓, 꼬리나 눈빛처럼 보호자가 알아차릴 수 있는 신호로 존재감을 전합니다. 즐거움이 빠르게 올라오는 만큼 마무리의 차분함도 함께 배워야 균형이 좋아집니다.",
    attachment:
      "보호자가 반응해줄 때 사랑받는 느낌을 강하게 기억합니다. 짧은 칭찬, 밝은 목소리, 즉각적인 눈맞춤이 관계의 불씨를 따뜻하게 키웁니다.",
    tension:
      "흥이 오른 뒤 갑자기 무시되거나, 놀이가 예고 없이 끝나거나, 주변 분위기가 크게 바뀌는 때에 마음이 흔들리기 쉽습니다.",
    routine:
      "짧고 선명한 놀이 뒤 조용한 쉬는 시간을 붙여주는 리듬이 좋습니다. 시작과 끝의 신호를 정하면 안정감이 커집니다.",
    yearFlow:
      "올해는 표현력이 살아나는 흐름입니다. 다만 들뜬 에너지를 부드럽게 정리하는 시간이 함께 있을 때 더 편안합니다.",
  },
  earth: {
    nature:
      "토의 결은 중심을 잡고 머무르는 힘입니다. 익숙한 자리, 같은 순서, 예측 가능한 하루에서 마음이 안정됩니다. 보호자 곁에 조용히 있으면서도 관계를 단단히 느끼는 타입이라, 반복되는 루틴이 곧 애정의 언어가 됩니다.",
    attachment:
      "늘 하던 시간에 밥을 먹고, 익숙한 자리에서 쉬고, 같은 목소리로 불러주는 흐름 속에서 사랑을 확인합니다.",
    tension:
      "생활 순서가 갑자기 바뀌거나, 쉬던 자리가 자주 달라지거나, 기다림의 기준이 불분명할 때 긴장이 올라오기 쉽습니다.",
    routine:
      "식사, 산책, 놀이, 휴식의 순서를 일정하게 잡아주는 방식이 잘 맞습니다. 익숙한 담요나 방석도 좋은 안정 신호가 됩니다.",
    yearFlow:
      "올해는 생활의 기준을 정돈하기 좋은 흐름입니다. 반복되는 좋은 습관이 쌓일수록 보호자와의 신뢰가 더 단단해집니다.",
  },
  metal: {
    nature:
      "금의 결은 기준을 세우고 경계를 살피는 힘입니다. 소리, 냄새, 거리감, 손길의 속도처럼 작은 차이를 민감하게 알아차립니다. 까다로워 보일 수 있지만, 사실은 자기만의 안전한 규칙을 통해 세상을 이해하려는 모습에 가깝습니다.",
    attachment:
      "예고 있는 접근과 일관된 약속을 통해 보호자를 믿습니다. 억지로 다가가는 것보다 기다려주는 태도에서 애정을 크게 느낍니다.",
    tension:
      "갑작스러운 접촉, 큰 소리, 낯선 사람이 빠르게 다가오는 흐름, 정리되지 않은 공간에서 긴장하기 쉽습니다.",
    routine:
      "깔끔한 휴식 자리, 일정한 산책 동선, 예고 후 스킨십, 반복되는 짧은 훈련이 잘 맞습니다.",
    yearFlow:
      "올해는 기준을 세우고 안정된 약속을 반복하기 좋은 흐름입니다. 작은 규칙이 쌓이면 마음의 여유가 커집니다.",
  },
  water: {
    nature:
      "수의 결은 깊이 관찰하고 천천히 반응하는 힘입니다. 바로 뛰어들기보다 먼저 지켜보고, 충분히 이해한 뒤 움직입니다. 잠과 휴식, 조용한 자리, 부드러운 분위기에서 감정이 정리되는 타입입니다.",
    attachment:
      "과한 표현보다 조용한 동행에서 사랑을 느낍니다. 보호자가 곁에 있어주되 서두르지 않을 때 마음을 열 가능성이 큽니다.",
    tension:
      "쉬는 시간이 부족하거나, 계속 반응을 요구받거나, 낯선 환경에서 숨을 고를 틈이 없을 때 긴장하기 쉽습니다.",
    routine:
      "조용한 휴식 공간, 느린 놀이, 짧은 관찰 시간, 낮은 목소리의 칭찬이 잘 맞습니다.",
    yearFlow:
      "올해는 마음의 속도를 존중할수록 좋은 흐름입니다. 충분히 쉬고 관찰한 뒤 움직이면 새로운 경험도 편안하게 받아들입니다.",
  },
};

function scoreLine(scores: Record<FiveElement, number>) {
  return (Object.keys(scores) as FiveElement[])
    .map((element) => `${getElementLabel(element)} ${scores[element]}점`)
    .join(", ");
}

function speciesLabel(type: PetSajuInput["type"]) {
  return type === "dog" ? "강아지" : "고양이";
}

function safeAssert(report: string) {
  const matchedTerm = forbiddenTerms.find((term) => report.includes(term));

  if (matchedTerm) {
    throw new Error(`Premium report contains a forbidden term: ${matchedTerm}`);
  }
}

export function generatePremiumPetSajuReport(input: PetSajuInput) {
  const profile = calculatePetFiveElements(input);
  const primary = profile.primaryElement;
  const secondary = profile.secondaryElement;
  const primaryLabel = getElementLabel(primary);
  const secondaryLabel = getElementLabel(secondary);
  const primaryDetail = elementDetails[primary];
  const secondaryDetail = elementDetails[secondary];
  const basisLabel =
    profile.calculationBasis === "birth_date" ? "생년월일" : "입양일";
  const timeLine = input.birthTimeUnknown
    ? "태어난 시간은 모름으로 두고 날짜의 큰 흐름과 입양일의 인연 흐름을 함께 보았습니다."
    : input.birthTime
      ? `태어난 시간 ${input.birthTime}은 세부 분위기를 읽는 보조 단서로 반영했습니다.`
      : "태어난 시간은 비어 있어 날짜의 큰 흐름을 중심으로 보았습니다.";
  const petLabel = speciesLabel(input.type);

  const sections = [
    `1. 기본 사주 해석
${input.name}의 심층 사주는 ${basisLabel}을 중심으로 오행의 흐름을 읽는 방식으로 구성했습니다. 입력한 정보를 바탕으로 구성된 맞춤형 해석이며, 한국식 사주에서 사용하는 목, 화, 토, 금, 수의 상징을 반려동물의 성향 언어로 바꾸어 살펴봅니다. ${input.name}에게 가장 앞에 서는 기운은 ${primaryLabel}이고, 그다음을 받쳐주는 기운은 ${secondaryLabel}입니다. ${primaryLabel}은 ${primaryDetail.nature} ${secondaryLabel}은 ${secondaryDetail.nature} 그래서 ${input.name}는 한 가지 모습으로만 설명하기보다, 보호자에게 보이는 일상적 행동과 혼자 있을 때의 리듬을 함께 보아야 더 자연스럽게 이해됩니다. ${timeLine} ${input.name}의 리포트는 단정적인 예언이 아니라, 보호자가 아이의 반응을 더 섬세하게 알아차리도록 돕는 해석입니다.`,

    `2. 오행 밸런스
${input.name}의 오행 점수는 ${scoreLine(profile.scores)}으로 계산되었습니다. 점수가 높다는 것은 그 기운이 좋고 낮다는 것은 부족하다는 뜻이 아닙니다. 반려동물에게 오행은 성향이 나타나는 통로에 가깝습니다. ${primaryLabel}의 기운이 높으면 ${input.name}는 ${primaryDetail.nature} 이런 결을 자주 보여줄 수 있습니다. ${secondaryLabel}의 기운은 그 모습을 보조하면서 행동의 색을 바꿉니다. 예를 들어 ${primaryLabel}이 앞에 서더라도 ${secondaryLabel}이 받쳐주면, 같은 자극 앞에서도 표현 방식이 부드러워지거나 더 신중해질 수 있습니다. 보호자는 점수의 높낮이를 평가하기보다, ${input.name}가 어떤 상황에서 편안해지고 어떤 리듬에서 자기다운 반응을 보이는지 관찰하는 것이 좋습니다. 오행 밸런스는 아이를 고정된 성격표에 넣는 도구가 아니라, 매일의 선택을 더 다정하게 조율하는 지도에 가깝습니다.`,

    `3. 타고난 성격
${input.name}는 ${petLabel}로서 기본적으로 보호자의 분위기를 읽는 감각을 갖고 있고, 그 위에 ${primaryLabel}의 결이 강하게 올라옵니다. 이 조합은 ${input.name}가 낯선 상황을 만났을 때 바로 한쪽으로만 반응하지 않고, 먼저 확인하고 자기 방식으로 해석한 뒤 움직인다는 뜻입니다. ${primaryDetail.nature} 동시에 ${secondaryLabel}의 영향 때문에 ${secondaryDetail.nature} 이런 분위기도 함께 보입니다. 그래서 ${input.name}는 보호자가 보기에는 때로 적극적이고 때로 조용해 보일 수 있습니다. 이것은 변덕이라기보다 자극의 종류와 공간의 안정도에 따라 반응 방식이 달라지는 모습입니다. ${input.name}에게는 자기 속도를 인정받는 경험이 중요합니다. 기다려주고, 짧게 알려주고, 성공한 순간을 작게 칭찬해주면 타고난 결이 더 편안하게 드러납니다.`,

    `4. 보호자에게 사랑을 표현하는 방식
${input.name}가 보호자에게 마음을 보이는 방식은 크고 화려한 표현만으로 판단하기 어렵습니다. ${primaryDetail.attachment} 또 ${secondaryLabel}의 결은 ${secondaryDetail.attachment} ${input.name}는 보호자의 말투, 손길의 속도, 하루의 반복되는 신호를 생각보다 잘 기억합니다. 그래서 보호자가 늘 비슷한 방식으로 이름을 불러주거나, 같은 시간대에 짧게 눈을 맞추거나, 놀이가 끝난 뒤 조용히 칭찬해주면 그 흐름이 애착의 언어가 됩니다. ${input.name}에게 사랑은 길게 설명되는 것이 아니라 반복되는 작은 행동으로 전달됩니다. 억지로 안거나 계속 반응을 요구하기보다, 아이가 다가오는 순간을 알아차리고 짧게 받아주는 쪽이 더 깊은 신뢰로 이어집니다. 보호자가 차분하게 일관성을 보여줄수록 ${input.name}는 자기 방식의 애정을 더 자주, 더 분명하게 보여줄 수 있습니다.`,

    `5. 스트레스 받기 쉬운 상황
${input.name}가 긴장하기 쉬운 상황은 ${primaryLabel}의 결에서 먼저 읽을 수 있습니다. ${primaryDetail.tension} 여기에 ${secondaryLabel}의 흐름이 더해지면 ${secondaryDetail.tension} 이런 상황에서도 마음이 쉽게 흔들릴 수 있습니다. 중요한 것은 보호자가 이를 문제 행동으로만 보지 않는 것입니다. ${input.name}는 불편함을 말로 설명할 수 없기 때문에 몸의 방향, 시선, 멈춤, 숨는 행동, 과한 흥분처럼 다양한 신호로 표현합니다. 이런 신호가 보이면 바로 더 강한 자극을 주기보다 잠시 공간을 줄이고, 익숙한 목소리와 짧은 안내로 분위기를 낮춰주는 것이 좋습니다. ${input.name}에게 필요한 것은 완벽한 통제가 아니라 예측 가능한 선택지입니다. 어디로 가면 쉴 수 있는지, 어떤 말이 끝 신호인지, 어떤 행동을 하면 칭찬받는지 알게 되면 긴장 상황에서도 더 빨리 안정감을 되찾습니다.`,

    `6. 잘 맞는 생활 루틴
${input.name}에게 잘 맞는 루틴은 ${primaryDetail.routine}입니다. ${secondaryLabel}의 기운까지 고려하면 ${secondaryDetail.routine}도 함께 넣어주면 좋습니다. 하루를 설계할 때는 큰 계획보다 작은 반복이 중요합니다. 예를 들어 아침에는 짧은 인사와 물 확인, 낮에는 간단한 놀이 또는 관찰 시간, 저녁에는 식사와 산책 또는 휴식, 잠들기 전에는 조용한 마무리 신호를 만드는 방식이 잘 맞습니다. ${input.name}는 반복되는 순서 속에서 보호자의 의도를 더 쉽게 이해합니다. 루틴이 단단해지면 새로운 장난감, 새로운 장소, 새로운 사람을 만나는 일도 더 부드럽게 받아들일 수 있습니다. 보호자는 ${input.name}가 잘 따라온 날에 크게 보상하기보다, 매일 같은 방식으로 작게 인정해주는 편이 좋습니다. 이 작고 꾸준한 인정이 ${input.name}에게는 생활 전체를 안정시키는 신호가 됩니다.`,

    `7. 올해의 흐름
올해 ${input.name}에게 중요한 흐름은 ${primaryDetail.yearFlow} ${secondaryLabel}의 보조 기운은 ${secondaryDetail.yearFlow} 이 두 흐름을 함께 보면, 올해는 ${input.name}에게 무언가를 갑자기 바꾸는 해라기보다 보호자와의 약속을 더 선명하게 만드는 시기로 읽힙니다. 산책 코스, 놀이 방식, 휴식 공간, 식사 전후의 신호처럼 이미 하고 있는 생활 안에서 기준을 조금 더 다듬어보세요. ${input.name}는 완전히 새로운 것보다 익숙한 것 안에 작은 변화를 넣었을 때 더 자연스럽게 반응합니다. 계절이 바뀔 때는 놀이 시간, 쉬는 자리, 외부 자극의 양을 조금씩 조정하면 좋습니다. 올해의 핵심은 속도가 아니라 리듬입니다. 보호자가 조급해하지 않고 ${input.name}의 반응을 확인하며 움직이면, 아이도 자기 속도로 더 안정된 자신감을 보여줄 수 있습니다.`,

    `8. 한 장 요약
${input.name}의 핵심 기운은 ${primaryLabel}, 보조 기운은 ${secondaryLabel}입니다. ${primaryLabel}은 ${primaryDetail.nature} ${secondaryLabel}은 ${secondaryDetail.nature} 이 조합은 ${input.name}가 보호자와의 관계에서 자기만의 속도와 반복되는 신호를 중요하게 여긴다는 뜻입니다. 잘 맞는 방식은 ${primaryDetail.routine}이며, 보호자가 기억해야 할 애착 포인트는 ${primaryDetail.attachment}입니다. 긴장이 올라오는 상황에서는 ${primaryDetail.tension}을 먼저 떠올려주세요. 올해의 흐름은 ${primaryDetail.yearFlow}로 정리할 수 있습니다. 결국 ${input.name}를 이해하는 가장 좋은 방법은 행동을 빠르게 판단하는 것이 아니라, 어떤 환경에서 편안해지고 어떤 말과 손길에 마음을 여는지 차분히 기록하는 것입니다. ${input.name}의 사주는 보호자가 아이를 더 오래 바라보게 만드는 따뜻한 관찰 노트에 가깝습니다.`,

    `9. 보호자를 위한 조언
${input.name}를 대할 때 보호자에게 가장 필요한 태도는 일관성과 여유입니다. ${input.name}는 보호자의 기분, 말투, 손의 움직임, 생활 순서를 하나의 흐름으로 받아들입니다. 그래서 보호자가 어떤 날은 크게 허용하고 어떤 날은 갑자기 막는 방식이 반복되면 아이는 기준을 잡기 어렵습니다. 반대로 짧은 말, 같은 손짓, 예측 가능한 마무리 신호가 반복되면 ${input.name}는 보호자를 더 편안한 중심으로 느낍니다. 오늘부터 할 수 있는 가장 좋은 실천은 세 가지입니다. 첫째, 하루에 한 번 ${input.name}가 가장 편안해 보이는 순간을 기록하세요. 둘째, 놀이와 휴식의 끝 신호를 하나로 정하세요. 셋째, 새로운 경험은 짧게 시작하고 성공한 순간에 멈춰주세요. 이 리포트는 ${input.name}의 미래를 단정하는 글이 아니라, 보호자가 아이의 마음결을 다정하게 읽기 위한 안내서입니다. ${input.name}는 이미 자기만의 방식으로 보호자에게 많은 신호를 보내고 있습니다. 보호자가 그 신호를 조금 더 천천히 받아주면, 관계는 더 부드럽고 깊은 방향으로 자라납니다.`,
  ];

  const report = sections.join("\n\n");
  safeAssert(report);

  return {
    report,
    profile,
  };
}
