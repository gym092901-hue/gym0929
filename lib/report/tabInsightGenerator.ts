import type { MascotMood } from "@/components/mascot/types";
import type { FiveElement } from "@/lib/saju/petSajuEngine";
import type { PetLifestyleProfile, PetSpecies } from "@/types/reading";

export type TabInsightId =
  | "overview"
  | "elements"
  | "attachment"
  | "routine"
  | "yearly"
  | "guardian"
  | "input"
  | "report";

export type TabInsight = {
  tabId: TabInsightId;
  title: string;
  body: string;
  mood: MascotMood;
};

type CreateTabInsightsInput = {
  petName: string;
  species: PetSpecies;
  dominantElement: FiveElement;
  secondaryElement: FiveElement;
  lifestyle: PetLifestyleProfile;
  birthDate?: string | null;
  adoptionDate?: string | null;
};

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const elementLead: Record<FiveElement, string> = {
  wood: "새로운 자극과 탐색 앞에서 마음이 열리는",
  fire: "표정과 몸짓으로 마음을 밝게 전하는",
  earth: "익숙한 순서와 편안한 자리에서 안정되는",
  metal: "낯선 자극 앞에서 먼저 확인하려는",
  water: "분위기를 조용히 살피고 천천히 다가오는",
};

function routineWord(species: PetSpecies) {
  return species === "dog"
    ? "산책, 냄새 맡기, 귀가 후 휴식"
    : "자기 자리, 창밖 관찰, 짧은 사냥놀이";
}

function attachmentWord(species: PetSpecies) {
  return species === "dog"
    ? "같은 말투와 같은 순서"
    : "느린 눈맞춤과 조용히 곁에 머무는 시간";
}

function activityHint(species: PetSpecies, lifestyle: PetLifestyleProfile) {
  const hasActivity = Boolean(lifestyle.dailyActivityFrequency);

  if (species === "dog") {
    return hasActivity
      ? "입력한 산책/놀이 리듬을 기준으로 활동 뒤 쉬는 시간을 붙여주면 좋아요"
      : "산책이나 노즈워크 뒤에 조용히 쉬는 시간을 붙여주면 좋아요";
  }

  return hasActivity
    ? "입력한 놀이 리듬을 기준으로 짧은 사냥놀이 뒤 자기 자리로 돌아갈 시간을 주세요"
    : "창가 관찰이나 숨숨집에서 쉬는 시간을 열어두면 좋아요";
}

export function createTabInsights({
  petName,
  species,
  dominantElement,
  secondaryElement,
  lifestyle,
  birthDate,
  adoptionDate,
}: CreateTabInsightsInput): Record<TabInsightId, TabInsight> {
  const dominantLabel = elementLabels[dominantElement];
  const secondaryLabel = elementLabels[secondaryElement];
  const petLead = elementLead[dominantElement];
  const routine = routineWord(species);
  const attachment = attachmentWord(species);
  const activity = activityHint(species, lifestyle);
  const basis = birthDate
    ? "입력한 생년월일과 처음 만난 날"
    : adoptionDate
      ? "처음 만난 날"
      : "입력한 기본 정보";

  return {
    overview: {
      tabId: "overview",
      title: "오늘의 핵심 해석",
      mood: "holding-card",
      body: `${petName}는 처음부터 모든 것을 빠르게 받아들이기보다 분위기를 살핀 뒤 편안해졌을 때 더 다정하게 다가오는 아이에 가까워요.`,
    },
    elements: {
      tabId: "elements",
      title: "생활 속 오행 힌트",
      mood: "star",
      body: `${dominantLabel}의 기운이 또렷한 아이는 ${petLead} 모습이 보여요. 보호자가 속도를 맞춰주면 ${secondaryLabel}의 리듬도 더 편안하게 쌓입니다.`,
    },
    attachment: {
      tabId: "attachment",
      title: "보호자와의 교감 힌트",
      mood: "happy",
      body: `${petName}는 큰 표현보다 반복되는 작은 신호에서 안정감을 느낄 수 있어요. ${attachment}가 ${petName}에게는 중요한 약속처럼 남을 수 있습니다.`,
    },
    routine: {
      tabId: "routine",
      title: "오늘 바로 해볼 루틴",
      mood: "curious",
      body: `오늘은 ${routine} 중 하나를 정해 같은 순서로 이어보세요. ${activity}.`,
    },
    yearly: {
      tabId: "yearly",
      title: "올해의 생활 포인트",
      mood: "reading",
      body: "올해는 새로운 것을 크게 바꾸기보다 이미 잘 맞는 루틴을 조금씩 다듬어가기 좋은 흐름으로 볼 수 있어요.",
    },
    guardian: {
      tabId: "guardian",
      title: "보호자가 기억할 한 문장",
      mood: "happy",
      body: `${petName}를 재촉하기보다 기다려주고, 반응이 작아도 알아봐주는 태도가 좋은 교감 방식이 될 수 있어요.`,
    },
    input: {
      tabId: "input",
      title: "분석 기준 안내",
      mood: "reading",
      body: `이번 리포트는 ${basis}를 기준으로, ${petName}의 성향과 생활 리듬을 부드럽게 해석했습니다.`,
    },
    report: {
      tabId: "report",
      title: "종합 정리",
      mood: "pdf",
      body: `${petName}의 종합 리포트는 보호자가 생활 속에서 관찰하고 맞춰볼 수 있는 포인트를 한 장의 보고서처럼 정리한 안내서예요.`,
    },
  };
}
