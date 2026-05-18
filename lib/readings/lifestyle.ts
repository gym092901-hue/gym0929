import type {
  AloneTime,
  DailyActivityFrequency,
  FavoriteActivity,
  GuardianDistance,
  GuardianQuestion,
  LivingEnvironment,
  PetLifestyleProfile,
  StrangerReaction,
} from "@/types/reading";

type Option<T extends string> = {
  value: T;
  label: string;
  dogCopy?: string;
  catCopy?: string;
};

export const livingEnvironmentOptions = [
  { value: "single_household", label: "1인 가구" },
  { value: "with_family", label: "가족과 함께" },
  { value: "with_other_pets", label: "다른 반려동물과 함께" },
  { value: "mostly_indoor", label: "실내 위주" },
  { value: "active_outdoor", label: "야외 활동 많음" },
] as const satisfies ReadonlyArray<Option<LivingEnvironment>>;

export const dailyActivityOptions = [
  { value: "rarely", label: "거의 안 함" },
  { value: "once", label: "1회" },
  { value: "twice", label: "2회" },
  { value: "three_plus", label: "3회 이상" },
] as const satisfies ReadonlyArray<Option<DailyActivityFrequency>>;

export const aloneTimeOptions = [
  { value: "almost_none", label: "거의 없음" },
  { value: "one_to_three", label: "1~3시간" },
  { value: "four_to_six", label: "4~6시간" },
  { value: "seven_plus", label: "7시간 이상" },
] as const satisfies ReadonlyArray<Option<AloneTime>>;

export const strangerReactionOptions = [
  {
    value: "approaches_quickly",
    label: "금방 다가감",
    dogCopy: "낯선 사람에게도 냄새를 확인하며 비교적 빠르게 다가가는 편",
    catCopy: "낯선 사람도 잠깐 관찰한 뒤 스스로 가까워지는 편",
  },
  {
    value: "observes_carefully",
    label: "조심스럽게 관찰",
    dogCopy: "낯선 사람 앞에서는 보호자 반응을 먼저 보는 관찰형",
    catCopy: "낯선 사람 앞에서는 캣타워나 자기 자리에서 먼저 살피는 관찰형",
  },
  {
    value: "barks_or_guards",
    label: "짖거나 경계",
    dogCopy: "낯선 접근에는 소리와 몸의 방향으로 기준을 세우는 편",
    catCopy: "낯선 접근에는 꼬리 끝 움직임이나 거리 두기로 기준을 세우는 편",
  },
  {
    value: "hides_or_avoids",
    label: "숨거나 피함",
    dogCopy: "낯선 자극 앞에서는 보호자 곁이나 익숙한 자리에서 천천히 확인하는 편",
    catCopy: "낯선 자극 앞에서는 숨숨집이나 자기 자리에서 천천히 확인하는 편",
  },
] as const satisfies ReadonlyArray<Option<StrangerReaction>>;

export const guardianDistanceOptions = [
  { value: "always_close", label: "항상 붙어 있음" },
  { value: "moderately_close", label: "적당히 가까움" },
  { value: "independent", label: "독립적인 편" },
  { value: "depends_on_mood", label: "기분에 따라 다름" },
] as const satisfies ReadonlyArray<Option<GuardianDistance>>;

export const favoriteActivityOptions = [
  { value: "walk", label: "산책" },
  { value: "ball_play", label: "공놀이" },
  { value: "treat_search", label: "간식 찾기" },
  { value: "petting", label: "쓰다듬기" },
  { value: "sleeping", label: "잠자기" },
  { value: "window_watch", label: "창밖 보기" },
  { value: "short_hunt_play", label: "짧은 사냥놀이" },
] as const satisfies ReadonlyArray<Option<FavoriteActivity>>;

export const guardianQuestionOptions = [
  { value: "personality", label: "우리 아이 성격" },
  { value: "bond", label: "나와의 교감 방식" },
  { value: "routine", label: "생활 루틴" },
  { value: "sensitive_moments", label: "예민해지는 순간" },
  { value: "year_flow", label: "올해의 흐름" },
  { value: "two_pet_match", label: "두 마리 궁합" },
] as const satisfies ReadonlyArray<Option<GuardianQuestion>>;

export const emptyLifestyleProfile: PetLifestyleProfile = {
  livingEnvironment: [],
  dailyActivityFrequency: null,
  aloneTime: null,
  strangerReaction: null,
  guardianDistance: null,
  favoriteActivities: [],
  guardianQuestions: [],
};

function valuesOf<T extends string>(options: ReadonlyArray<Option<T>>) {
  return new Set(options.map((option) => option.value));
}

const livingEnvironmentValues = valuesOf(livingEnvironmentOptions);
const dailyActivityValues = valuesOf(dailyActivityOptions);
const aloneTimeValues = valuesOf(aloneTimeOptions);
const strangerReactionValues = valuesOf(strangerReactionOptions);
const guardianDistanceValues = valuesOf(guardianDistanceOptions);
const favoriteActivityValues = valuesOf(favoriteActivityOptions);
const guardianQuestionValues = valuesOf(guardianQuestionOptions);

function normalizeArray<T extends string>(
  value: unknown,
  allowedValues: Set<T>,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((item): item is T =>
        typeof item === "string" && allowedValues.has(item as T),
      ),
    ),
  );
}

function normalizeSingle<T extends string>(
  value: unknown,
  allowedValues: Set<T>,
): T | null {
  return typeof value === "string" && allowedValues.has(value as T)
    ? (value as T)
    : null;
}

export function normalizeLifestyleProfile(value: unknown): PetLifestyleProfile {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    livingEnvironment: normalizeArray(
      source.livingEnvironment ?? source.living_environment,
      livingEnvironmentValues,
    ),
    dailyActivityFrequency: normalizeSingle(
      source.dailyActivityFrequency ?? source.daily_activity_frequency,
      dailyActivityValues,
    ),
    aloneTime: normalizeSingle(source.aloneTime ?? source.alone_time, aloneTimeValues),
    strangerReaction: normalizeSingle(
      source.strangerReaction ?? source.stranger_reaction,
      strangerReactionValues,
    ),
    guardianDistance: normalizeSingle(
      source.guardianDistance ?? source.guardian_distance,
      guardianDistanceValues,
    ),
    favoriteActivities: normalizeArray(
      source.favoriteActivities ?? source.favorite_activities,
      favoriteActivityValues,
    ),
    guardianQuestions: normalizeArray(
      source.guardianQuestions ?? source.guardian_questions,
      guardianQuestionValues,
    ),
  };
}

function findLabel<T extends string>(
  options: ReadonlyArray<Option<T>>,
  value: T | null | undefined,
) {
  if (!value) {
    return null;
  }

  return options.find((option) => option.value === value)?.label ?? null;
}

export function getLifestyleLabel(
  field:
    | "dailyActivityFrequency"
    | "aloneTime"
    | "strangerReaction"
    | "guardianDistance",
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  if (field === "dailyActivityFrequency") {
    return findLabel(dailyActivityOptions, value as DailyActivityFrequency);
  }

  if (field === "aloneTime") {
    return findLabel(aloneTimeOptions, value as AloneTime);
  }

  if (field === "strangerReaction") {
    return findLabel(strangerReactionOptions, value as StrangerReaction);
  }

  return findLabel(guardianDistanceOptions, value as GuardianDistance);
}

function labelsFor<T extends string>(
  options: ReadonlyArray<Option<T>>,
  values: T[],
) {
  return values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
}

export function getLifestyleSummaryTags({
  petName,
  species,
  birthTimeUnknown,
  lifestyle,
}: {
  petName?: string;
  species?: "dog" | "cat" | "";
  birthTimeUnknown?: boolean;
  lifestyle: PetLifestyleProfile;
}) {
  const tags: string[] = [];

  if (petName?.trim()) {
    tags.push(petName.trim());
  }

  if (species === "dog") {
    tags.push("강아지");
  } else if (species === "cat") {
    tags.push("고양이");
  }

  if (birthTimeUnknown) {
    tags.push("태어난 시간 모름");
  }

  const activityLabel = getLifestyleLabel(
    "dailyActivityFrequency",
    lifestyle.dailyActivityFrequency,
  );
  if (activityLabel) {
    tags.push(`산책/놀이 ${activityLabel}`);
  }

  const strangerLabel = getLifestyleLabel(
    "strangerReaction",
    lifestyle.strangerReaction,
  );
  if (strangerLabel) {
    tags.push(`낯선 사람은 ${strangerLabel}`);
  }

  const distanceLabel = getLifestyleLabel(
    "guardianDistance",
    lifestyle.guardianDistance,
  );
  if (distanceLabel) {
    tags.push(`보호자와 ${distanceLabel}`);
  }

  tags.push(...labelsFor(livingEnvironmentOptions, lifestyle.livingEnvironment));
  tags.push(...labelsFor(favoriteActivityOptions, lifestyle.favoriteActivities));
  tags.push(...labelsFor(guardianQuestionOptions, lifestyle.guardianQuestions));

  return tags;
}

function dogRoutineByActivity(value: DailyActivityFrequency | null) {
  if (value === "rarely") {
    return "산책이나 놀이가 많지 않은 날에는 짧은 냄새 맡기, 간식 찾기, 귀가 후 같은 자리에서 쉬는 작은 루틴만으로도 하루의 리듬을 만들 수 있어요.";
  }

  if (value === "once") {
    return "하루 한 번 산책이나 놀이가 있다면 출발 전 하네스 준비 신호와 돌아온 뒤 물 마시기, 조용히 쉬기를 같은 순서로 이어주면 좋아요.";
  }

  if (value === "twice") {
    return "하루 두 번 움직이는 리듬은 오전에는 냄새 맡기, 저녁에는 짧은 교감 놀이처럼 역할을 나누면 더 편안하게 이어질 수 있어요.";
  }

  if (value === "three_plus") {
    return "활동이 많은 편이라면 매번 세게 놀기보다 짧은 산책, 냄새 맡기, 귀가 후 휴식을 번갈아 넣어 들뜬 마음을 차분히 마무리해 주세요.";
  }

  return "산책, 놀이, 휴식을 갑자기 크게 바꾸기보다 같은 준비 신호와 같은 마무리 시간을 반복하면 하루가 더 안정적으로 느껴질 수 있어요.";
}

function catRoutineByActivity(value: DailyActivityFrequency | null) {
  if (value === "rarely") {
    return "놀이가 많지 않은 날에도 창밖 관찰, 짧은 사냥놀이 한 번, 자기 자리에서 쉬는 시간을 이어주면 고양이다운 리듬이 살아나요.";
  }

  if (value === "once") {
    return "하루 한 번 놀아준다면 장난감을 천천히 움직여 시선을 모으고, 끝난 뒤에는 자기 자리나 숨숨집으로 돌아갈 여유를 남겨주세요.";
  }

  if (value === "twice") {
    return "하루 두 번 놀이는 짧은 사냥놀이와 창밖 관찰을 나누어 배치하면 좋아요. 놀이 뒤에는 캣타워나 익숙한 자리에서 조용히 정리할 수 있게 해주세요.";
  }

  if (value === "three_plus") {
    return "자극이 많은 날에는 놀이 사이사이에 혼자 쉬는 시간을 충분히 남겨주세요. 고양이는 짧게 몰입하고 자기 자리로 돌아갈 때 리듬이 편해질 수 있어요.";
  }

  return "짧은 사냥놀이, 창밖 관찰, 자기 자리 휴식을 한 흐름으로 이어주면 고양이에게 예측 가능한 하루가 됩니다.";
}

export function createLifestyleContextCopy(
  lifestyle: PetLifestyleProfile,
  type: "dog" | "cat",
) {
  const activityCopy =
    type === "dog"
      ? dogRoutineByActivity(lifestyle.dailyActivityFrequency)
      : catRoutineByActivity(lifestyle.dailyActivityFrequency);
  const strangerOption = strangerReactionOptions.find(
    (option) => option.value === lifestyle.strangerReaction,
  );
  const strangerCopy =
    type === "dog"
      ? strangerOption?.dogCopy
      : strangerOption?.catCopy;
  const distanceLabel = getLifestyleLabel(
    "guardianDistance",
    lifestyle.guardianDistance,
  );
  const aloneLabel = getLifestyleLabel("aloneTime", lifestyle.aloneTime);
  const favoriteLabels = labelsFor(
    favoriteActivityOptions,
    lifestyle.favoriteActivities,
  );
  const questionLabels = labelsFor(
    guardianQuestionOptions,
    lifestyle.guardianQuestions,
  );

  return {
    activityCopy,
    strangerCopy,
    distanceLabel,
    aloneLabel,
    favoriteLabels,
    questionLabels,
    hasLifestyle:
      lifestyle.livingEnvironment.length > 0 ||
      Boolean(lifestyle.dailyActivityFrequency) ||
      Boolean(lifestyle.aloneTime) ||
      Boolean(lifestyle.strangerReaction) ||
      Boolean(lifestyle.guardianDistance) ||
      lifestyle.favoriteActivities.length > 0 ||
      lifestyle.guardianQuestions.length > 0,
  };
}
