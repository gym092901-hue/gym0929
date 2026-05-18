"use client";

import { useState } from "react";
import { PetMascot } from "@/components/mascot/PetMascot";
import { postposition } from "@/lib/korean/postposition";
import type {
  FiveElement,
  FiveElementScore,
} from "@/lib/saju/petSajuEngine";
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
    keywords: "호기심, 성장, 탐색",
    colorClass: "bg-moss",
    trackClass: "bg-moss/10",
    speciesText: {
      dog: "산책길 탐색, 냄새 맡기, 놀이 확장처럼 바깥의 변화를 즐겁게 받아들이는 리듬이에요.",
      cat: "창밖 관찰, 새로운 장난감 탐색, 자기 영역을 천천히 넓혀보는 리듬이에요.",
    },
  },
  fire: {
    label: "화",
    keywords: "표현력, 애교, 활발함",
    colorClass: "bg-persimmon",
    trackClass: "bg-persimmon/10",
    speciesText: {
      dog: "꼬리, 표정, 몸짓, 보호자 반응으로 마음을 빠르게 보여주는 리듬이에요.",
      cat: "울음, 몸 비비기, 느린 눈맞춤처럼 짧지만 분명하게 존재감을 전하는 리듬이에요.",
    },
  },
  earth: {
    label: "토",
    keywords: "안정감, 루틴, 신뢰",
    colorClass: "bg-amber-600",
    trackClass: "bg-amber-100",
    speciesText: {
      dog: "밥, 산책, 휴식의 순서가 익숙할수록 마음을 편하게 놓는 리듬이에요.",
      cat: "자기 자리, 식사 시간, 캣타워와 숨숨집 위치가 일정할수록 안정되는 리듬이에요.",
    },
  },
  metal: {
    label: "금",
    keywords: "규칙, 예민함, 경계",
    colorClass: "bg-berry",
    trackClass: "bg-berry/10",
    speciesText: {
      dog: "낯선 소리, 접근 속도, 거리감을 먼저 살피며 기준을 세우는 리듬이에요.",
      cat: "낯선 소리, 손길의 기준, 공간 규칙을 섬세하게 확인하고 자기 속도를 지키는 리듬이에요.",
    },
  },
  water: {
    label: "수",
    keywords: "관찰, 신중함, 감정 흡수",
    colorClass: "bg-sky-600",
    trackClass: "bg-sky-100",
    speciesText: {
      dog: "보호자의 표정과 분위기를 살피고 충분히 확인한 뒤 반응하는 리듬이에요.",
      cat: "조용히 관찰하고 거리와 시간을 조절하며 자기 방식으로 다가오는 리듬이에요.",
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
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-[2rem] bg-persimmon/10">
          <PetMascot species={species} mood="star" size="md" decorative />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-persimmon">오행 밸런스</p>
            <h2 className="mt-1 break-keep text-2xl font-black text-ink">
              {petNamePossessive} 기운 흐름
            </h2>
          </div>
          <div className="max-w-sm rounded-[1.5rem] border border-berry/10 bg-white/65 px-4 py-3">
            <p className="text-sm font-semibold leading-6 text-ink/65">
              낮음은 부족하다는 뜻이 아니라, 생활 속에서 천천히 넓혀볼 수 있는 방향이에요.
              점수 대신 부드러운 상태 표현으로만 보여드려요.
            </p>
          </div>
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
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cream">
                  <PetMascot
                    species={species}
                    mood={isStrongest ? "star" : isGentle ? "curious" : "happy"}
                    size="sm"
                    decorative
                    className="scale-75"
                  />
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-base font-black text-ink shadow-sm">
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
                    천천히 채워주면 좋은 리듬
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
