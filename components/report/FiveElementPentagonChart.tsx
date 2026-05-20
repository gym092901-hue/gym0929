import { postposition } from "@/lib/korean/postposition";
import type {
  FiveElement,
  FiveElementScore,
} from "@/lib/saju/petSajuEngine";
import type { PetSpecies } from "@/types/reading";

type FiveElementPentagonChartProps = {
  petName: string;
  species: PetSpecies;
  scores: FiveElementScore;
  variant?: "free" | "premium";
};

type ElementSupportGuideProps = {
  petName: string;
  species: PetSpecies;
  scores: FiveElementScore;
};

const orderedElements: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

const elementLabels: Record<FiveElement, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const elementKeywords: Record<FiveElement, string> = {
  wood: "호기심·탐색",
  fire: "표현력·애교",
  earth: "안정감·루틴",
  metal: "규칙·거리감",
  water: "관찰·신중함",
};

const elementColors: Record<FiveElement, string> = {
  wood: "#6FAE7B",
  fire: "#F39A5F",
  earth: "#D6A04F",
  metal: "#E85D8B",
  water: "#5E9FD6",
};

const supportAdvice: Record<FiveElement, Record<PetSpecies, string>> = {
  wood: {
    dog: "산책길에서 냄새 맡는 시간을 조금 더 주고, 익숙한 길에 작은 변화를 하나만 더해보세요.",
    cat: "새 장난감은 바로 들이밀기보다 바닥에 두고, 스스로 다가와 탐색할 시간을 주세요.",
  },
  fire: {
    dog: "이름을 부른 뒤 짧게 칭찬하고, 꼬리나 표정으로 보낸 신호를 바로 받아주세요.",
    cat: "느린 눈맞춤, 짧은 말 걸기, 몸 비비기를 받아주는 식으로 작은 표현을 알아봐 주세요.",
  },
  earth: {
    dog: "밥, 산책, 휴식 순서를 비슷하게 유지하고 귀가 후 조용한 마무리 루틴을 붙여주세요.",
    cat: "자기 자리, 캣타워, 숨숨집의 위치를 자주 바꾸지 않고 예측 가능한 동선을 유지해 주세요.",
  },
  metal: {
    dog: "낯선 사람이나 소리를 만날 때 바로 가까이 가기보다 거리와 냄새를 확인할 시간을 주세요.",
    cat: "손길보다 거리 조절을 먼저 존중하고, 먼저 다가올 때까지 기다리는 쪽이 잘 맞아요.",
  },
  water: {
    dog: "활동 뒤 조용히 쉬는 시간을 만들고, 보호자의 목소리 톤을 차분하게 맞춰주세요.",
    cat: "창밖 관찰이나 조용한 자리에서 혼자 정리할 시간을 두고, 밤 루틴을 부드럽게 반복해 주세요.",
  },
};

function getLevel(score: number) {
  if (score >= 4) return "강함";
  if (score >= 3) return "뚜렷함";
  if (score >= 2) return "보통";

  return "옅음";
}

function getRankedElements(scores: FiveElementScore) {
  return orderedElements
    .map((element) => ({ element, score: scores[element] }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        orderedElements.indexOf(a.element) - orderedElements.indexOf(b.element),
    );
}

function getSoftElements(scores: FiveElementScore) {
  const minScore = Math.min(...orderedElements.map((element) => scores[element]));

  return orderedElements.filter((element) => scores[element] === minScore);
}

function polarToPoint(index: number, radius: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / orderedElements.length;

  return {
    x: 100 + Math.cos(angle) * radius,
    y: 100 + Math.sin(angle) * radius,
  };
}

function pointsToString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function buildPolygon(scores: FiveElementScore) {
  const maxScore = Math.max(...orderedElements.map((element) => scores[element]), 1);

  return orderedElements.map((element, index) => {
    const ratio = Math.max(0.18, scores[element] / maxScore);

    return polarToPoint(index, 18 + ratio * 58);
  });
}

export function FiveElementPentagonChart({
  petName,
  species,
  scores,
  variant = "free",
}: FiveElementPentagonChartProps) {
  const rankedElements = getRankedElements(scores);
  const strongest = rankedElements[0]?.element;
  const softElements = getSoftElements(scores);
  const polygon = buildPolygon(scores);
  const petTopic = postposition.topic(petName);
  const petPossessive = postposition.possessive(petName);
  const animalLabel = species === "cat" ? "고양이" : "강아지";
  const title =
    variant === "premium"
      ? `${petPossessive} 오행 기운 지도`
      : `${petPossessive} 오행 맛보기`;

  return (
    <section
      className="rounded-[2rem] border border-berry/10 bg-white/82 p-5 shadow-soft sm:p-6"
      data-testid="five-element-pentagon-chart"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="text-sm font-black text-persimmon">오행 기운 5각형</p>
          <h2 className="mt-1 break-keep text-2xl font-black text-ink">
            {title}
          </h2>
          <p className="mt-3 break-keep text-sm font-semibold leading-6 text-ink/62">
            {petTopic} {animalLabel}답게 어떤 기운을 많이 드러내고,
            어떤 기운은 생활 속에서 천천히 채워가면 좋을지 부드럽게
            보여주는 차트예요.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
          <div className="relative mx-auto aspect-square w-full max-w-[240px]">
            <svg
              viewBox="0 0 200 200"
              role="img"
              aria-label={`${petName} 오행 기운 5각형 차트`}
              className="h-full w-full overflow-visible"
            >
              {[76, 58, 40].map((radius) => (
                <polygon
                  key={radius}
                  points={pointsToString(
                    orderedElements.map((_, index) => polarToPoint(index, radius)),
                  )}
                  fill="none"
                  stroke="#F1D9C1"
                  strokeWidth="1.5"
                />
              ))}
              {orderedElements.map((element, index) => {
                const end = polarToPoint(index, 76);

                return (
                  <line
                    key={element}
                    x1="100"
                    y1="100"
                    x2={end.x}
                    y2={end.y}
                    stroke="#F1D9C1"
                    strokeWidth="1"
                  />
                );
              })}
              <polygon
                points={pointsToString(polygon)}
                fill="rgba(232, 93, 139, 0.20)"
                stroke="#E85D8B"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {polygon.map((point, index) => {
                const element = orderedElements[index];

                return (
                  <circle
                    key={element}
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill={elementColors[element]}
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
              {orderedElements.map((element, index) => {
                const labelPoint = polarToPoint(index, 91);

                return (
                  <g key={element}>
                    <circle
                      cx={labelPoint.x}
                      cy={labelPoint.y}
                      r="13"
                      fill="white"
                      stroke={elementColors[element]}
                      strokeWidth="1.5"
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y + 5}
                      textAnchor="middle"
                      className="fill-ink text-[14px] font-black"
                    >
                      {elementLabels[element]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="grid gap-2">
            {orderedElements.map((element) => {
              const isStrongest = element === strongest;
              const isSoft = softElements.includes(element);

              return (
                <div
                  key={element}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream/75 px-3 py-2"
                >
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-sm font-black text-white"
                    style={{ backgroundColor: elementColors[element] }}
                  >
                    {elementLabels[element]}
                  </span>
                  <span className="text-sm font-black text-ink">
                    {elementKeywords[element]}
                  </span>
                  <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-black text-ink/60">
                    {getLevel(scores[element])}
                  </span>
                  {isStrongest ? (
                    <span className="rounded-full bg-berry/10 px-3 py-1 text-xs font-black text-berry">
                      대표 기운
                    </span>
                  ) : null}
                  {isSoft ? (
                    <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-black text-moss">
                      채워볼 리듬
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ElementSupportGuide({
  petName,
  species,
  scores,
}: ElementSupportGuideProps) {
  const softElements = getSoftElements(scores);
  const petTopic = postposition.topic(petName);

  return (
    <section
      className="rounded-[2rem] border border-moss/15 bg-moss/5 p-5 shadow-sm sm:p-6"
      data-testid="element-support-guide"
    >
      <p className="text-sm font-black text-moss">천천히 채워보는 오행 리듬</p>
      <h3 className="mt-2 break-keep text-2xl font-black text-ink">
        {petTopic} 생활 속에서 이렇게 보강해볼 수 있어요
      </h3>
      <p className="mt-3 break-keep text-sm font-semibold leading-6 text-ink/62">
        낮게 보이는 기운은 나쁜 점수가 아니라, 보호자가 하루 루틴 안에서
        천천히 넓혀줄 수 있는 방향입니다.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {softElements.map((element) => (
          <article
            key={element}
            className="rounded-[1.5rem] border border-moss/15 bg-white/82 p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl text-base font-black text-white"
                style={{ backgroundColor: elementColors[element] }}
              >
                {elementLabels[element]}
              </span>
              <div>
                <p className="text-sm font-black text-ink">
                  {elementKeywords[element]}
                </p>
                <p className="text-xs font-black text-moss">채워볼 리듬</p>
              </div>
            </div>
            <p className="mt-3 break-keep text-sm font-bold leading-6 text-ink/68">
              {supportAdvice[element][species]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
