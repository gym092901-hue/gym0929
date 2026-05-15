"use client";

import { useState } from "react";
import type {
  FiveElement,
  FiveElementScore,
} from "@/lib/saju/petSajuEngine";
import { postposition } from "@/lib/korean/postposition";
import type { PetSpecies } from "@/types/reading";

type PetElementBalanceProps = {
  petName: string;
  species: PetSpecies;
  scores: FiveElementScore;
};

const orderedElements: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

const elementMeta: Record<
  FiveElement,
  {
    label: string;
    keywords: string;
    colorClass: string;
    trackClass: string;
    speciesText: Record<PetSpecies, string>;
  }
> = {
  wood: {
    label: "목",
    keywords: "호기심, 탐험, 성장",
    colorClass: "bg-moss",
    trackClass: "bg-moss/10",
    speciesText: {
      dog: "산책길 탐색, 냄새 맡기, 놀이 확장처럼 바깥을 향한 호기심으로 살아나는 흐름이에요.",
      cat: "창밖 관찰, 새로운 장난감 탐색, 집 안 동선 살피기처럼 조용히 넓어지는 흐름이에요.",
    },
  },
  fire: {
    label: "화",
    keywords: "애교, 표현력, 존재감",
    colorClass: "bg-persimmon",
    trackClass: "bg-persimmon/10",
    speciesText: {
      dog: "꼬리, 표정, 몸짓, 보호자의 반응을 확인하는 모습으로 교감 온도를 높이는 흐름이에요.",
      cat: "울음, 몸 비비기, 짧은 애정 표현처럼 조용하지만 또렷하게 존재감을 전하는 흐름이에요.",
    },
  },
  earth: {
    label: "토",
    keywords: "안정감, 루틴, 익숙함",
    colorClass: "bg-amber-600",
    trackClass: "bg-amber-100",
    speciesText: {
      dog: "밥, 산책, 휴식 순서가 익숙할수록 마음을 놓고 편안하게 기대는 흐름이에요.",
      cat: "자기 자리, 식사 시간, 영역의 안정감이 이어질수록 마음이 느긋해지는 흐름이에요.",
    },
  },
  metal: {
    label: "금",
    keywords: "예민함, 경계심, 규칙성",
    colorClass: "bg-berry",
    trackClass: "bg-berry/10",
    speciesText: {
      dog: "낯선 소리, 접근 속도, 거리감을 먼저 살피고 예고 있는 손길에 신뢰를 쌓는 흐름이에요.",
      cat: "낯선 소리, 손길의 기준, 공간 규칙을 섬세하게 느끼며 자기 리듬을 지키는 흐름이에요.",
    },
  },
  water: {
    label: "수",
    keywords: "관찰력, 감수성, 신중함",
    colorClass: "bg-sky-600",
    trackClass: "bg-sky-100",
    speciesText: {
      dog: "보호자의 표정과 분위기를 관찰하고 충분히 확인한 뒤 신중하게 반응하는 흐름이에요.",
      cat: "조용한 관찰, 거리 조절, 밤 시간 루틴 안에서 자기 방식으로 다가오는 흐름이에요.",
    },
  },
};

function elementLevel(score: number) {
  if (score >= 4) return "강함";
  if (score >= 3) return "뚜렷함";
  if (score >= 2) return "보통";

  return "낮음";
}

function rankElements(scores: FiveElementScore) {
  return orderedElements
    .map((element) => ({ element, score: scores[element] }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        orderedElements.indexOf(a.element) - orderedElements.indexOf(b.element),
    );
}

export function PetElementBalance({
  petName,
  species,
  scores,
}: PetElementBalanceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rankedElements = rankElements(scores);
  const strongestElement = rankedElements[0]?.element;
  const gentleElement = rankedElements.at(-1)?.element;
  const maxScore = Math.max(...orderedElements.map((element) => scores[element]), 1);
  const petNamePossessive = postposition.possessive(petName);

  return (
    <section className="warm-panel rounded-[2rem] p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-persimmon">오행 밸런스</p>
          <h2 className="mt-1 break-keep text-2xl font-black text-ink">
            {petNamePossessive} 기운 흐름
          </h2>
        </div>
        <div className="max-w-sm rounded-[1.5rem] border border-berry/10 bg-white/65 px-4 py-3">
          <p className="text-sm font-semibold leading-6 text-ink/65">
            내부 계산값은 평가 점수가 아니라 성향을 읽기 위한 참고값입니다.
            낮음은 나쁜 점수가 아니라, 생활에서 천천히 채워줄 수 있는
            방향이에요.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {orderedElements.map((element, index) => {
          const meta = elementMeta[element];
          const score = scores[element];
          const width = `${Math.max(14, Math.round((score / maxScore) * 100))}%`;
          const isStrongest = element === strongestElement;
          const isGentle = element === gentleElement && element !== strongestElement;

          return (
            <article
              key={element}
              className={`rounded-[1.5rem] border border-berry/10 bg-white/75 p-4 shadow-sm ${
                !isExpanded && index >= 3 ? "hidden sm:block" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cream text-base font-black text-ink">
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-ink">{meta.keywords}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                    {meta.speciesText[species]}
                  </p>
                </div>
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-black text-ink/65">
                  {elementLevel(score)}
                </span>
                {isStrongest ? (
                  <span className="rounded-full bg-berry/10 px-3 py-1 text-xs font-black text-berry">
                    대표 기운
                  </span>
                ) : null}
                {isGentle ? (
                  <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-black text-moss">
                    생활에서 채워주면 좋은 리듬
                  </span>
                ) : null}
              </div>
              <div
                className={`mt-4 h-3 overflow-hidden rounded-full ${meta.trackClass}`}
                aria-label={`${meta.label} 기운 ${elementLevel(score)}`}
              >
                <div
                  className={`h-full rounded-full ${meta.colorClass}`}
                  style={{ width }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-berry/15 bg-white px-5 py-3 text-sm font-black text-berry shadow-sm transition hover:border-berry/35 hover:bg-berry/5 sm:hidden"
      >
        {isExpanded ? "오행 카드 접기" : "오행 카드 모두 보기"}
      </button>
    </section>
  );
}
