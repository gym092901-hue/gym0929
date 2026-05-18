type PetInputSummaryTagsProps = {
  petName: string;
  species: "dog" | "cat";
  birthDate?: string | null;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  adoptionDate?: string | null;
  lifestyle?: string | null;
  livingEnvironment?: string[];
  activityLevel?: string | null;
  aloneTime?: string | null;
  strangerReaction?: string | null;
  guardianDistance?: string | null;
  favoriteActivities?: string[];
};

const toneClasses = [
  "border-berry/15 bg-berry/10 text-berry",
  "border-moss/20 bg-moss/10 text-moss",
  "border-persimmon/20 bg-persimmon/10 text-persimmon",
  "border-oat/80 bg-white/80 text-ink/65",
];

const livingEnvironmentLabels: Record<string, string> = {
  single_household: "1인 가구",
  with_family: "가족과 함께",
  with_other_pets: "다른 반려동물과 함께",
  mostly_indoor: "실내 위주",
  active_outdoor: "야외 활동 많음",
};

const activityLabels: Record<string, string> = {
  rarely: "거의 안 함",
  once: "1회",
  twice: "2회",
  three_plus: "3회 이상",
};

const aloneTimeLabels: Record<string, string> = {
  almost_none: "거의 없음",
  one_to_three: "1~3시간",
  four_to_six: "4~6시간",
  seven_plus: "7시간 이상",
};

const strangerReactionLabels: Record<string, string> = {
  approaches_quickly: "금방 다가감",
  observes_carefully: "관찰형",
  barks_or_guards: "경계형",
  hides_or_avoids: "피하거나 숨는 편",
};

const guardianDistanceLabels: Record<string, string> = {
  always_close: "항상 붙어 있음",
  moderately_close: "적당히 가까움",
  independent: "독립적인 편",
  depends_on_mood: "기분에 따라 다름",
};

const favoriteActivityLabels: Record<string, string> = {
  walk: "산책",
  ball_play: "공놀이",
  treat_search: "간식 찾기",
  petting: "쓰다듬기",
  sleeping: "잠자기",
  window_watch: "창밖 보기",
  short_hunt_play: "짧은 사냥놀이",
};

function cleanTag(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null;
  }

  return trimmed;
}

function labelsFromMap(map: Record<string, string>, values?: string[]) {
  if (!values?.length) {
    return [];
  }

  return values.map((value) => map[value] ?? value).filter(Boolean);
}

function buildTags({
  petName,
  species,
  birthDate,
  birthTime,
  birthTimeUnknown,
  adoptionDate,
  lifestyle,
  livingEnvironment,
  activityLevel,
  aloneTime,
  strangerReaction,
  guardianDistance,
  favoriteActivities,
}: PetInputSummaryTagsProps) {
  const speciesLabel = species === "dog" ? "강아지" : "고양이";
  const activityLabel = activityLevel ? activityLabels[activityLevel] : null;
  const aloneLabel = aloneTime ? aloneTimeLabels[aloneTime] : null;
  const strangerLabel = strangerReaction
    ? strangerReactionLabels[strangerReaction]
    : null;
  const distanceLabel = guardianDistance
    ? guardianDistanceLabels[guardianDistance]
    : null;
  const environmentLabels = labelsFromMap(
    livingEnvironmentLabels,
    livingEnvironment,
  );
  const favoriteLabels = labelsFromMap(
    favoriteActivityLabels,
    favoriteActivities,
  );
  const tags = [
    cleanTag(petName),
    speciesLabel,
    birthDate ? `생년월일 ${birthDate}` : null,
    birthTimeUnknown
      ? "태어난 시간 모름"
      : birthTime
        ? `태어난 시간 ${birthTime}`
        : null,
    adoptionDate ? `만난 날 ${adoptionDate}` : null,
    cleanTag(lifestyle),
    ...environmentLabels,
    activityLabel ? `${species === "dog" ? "산책" : "놀이"} ${activityLabel}` : null,
    aloneLabel ? `혼자 있는 시간 ${aloneLabel}` : null,
    strangerLabel ? `낯선 사람은 ${strangerLabel}` : null,
    distanceLabel ? `보호자와 ${distanceLabel}` : null,
    favoriteLabels.length
      ? `좋아하는 활동: ${favoriteLabels.join(", ")}`
      : null,
  ];

  return tags.filter((tag): tag is string => Boolean(cleanTag(tag)));
}

export function PetInputSummaryTags(props: PetInputSummaryTagsProps) {
  const tags = buildTags(props);

  if (tags.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="pet-input-summary-tags"
      className="rounded-[1.75rem] border border-berry/10 bg-white/70 p-4 shadow-sm sm:p-5"
    >
      <p className="text-sm font-black text-ink">입력 정보 요약</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`rounded-full border px-3.5 py-2 text-xs font-black shadow-sm ${
              toneClasses[index % toneClasses.length]
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
