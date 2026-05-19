"use client";

import type { MascotMood } from "@/components/mascot/types";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type CatMascotProps = {
  mood?: MascotMood;
  className?: string;
  label?: string;
  variant?: number | string;
};

const mascotSrcs = [
  "/mascots/cats/cat-01.png",
  "/mascots/cats/cat-02.png",
  "/mascots/cats/cat-03.png",
  "/mascots/cats/cat-04.png",
  "/mascots/cats/cat-05.png",
  "/mascots/cats/cat-06.png",
  "/mascots/cats/cat-07.png",
  "/mascots/cats/cat-08.png",
  "/mascots/cats/cat-09.png",
  "/mascots/cats/cat-10.png",
  "/mascots/cat-mascot.png",
];

function hashVariant(value: number | string) {
  if (typeof value === "number") {
    return Math.abs(Math.floor(value));
  }

  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickMascotSrc(variant: number | string | undefined, randomIndex: number) {
  const index =
    variant === undefined ? randomIndex : hashVariant(variant) % mascotSrcs.length;

  return mascotSrcs[index] ?? mascotSrcs[0];
}

function moodAccessory(mood: MascotMood) {
  if (mood === "pdf") {
    return (
      <span
        aria-hidden="true"
        className="absolute bottom-[8%] right-[7%] rounded-2xl border-2 border-[#4A3028]/15 bg-white/95 px-2.5 py-1 text-[0.52rem] font-black text-moss shadow-sm sm:text-[0.62rem]"
      >
        PDF
      </span>
    );
  }

  if (["reading", "holding-card", "payment", "star"].includes(mood)) {
    return (
      <span
        aria-hidden="true"
        className="absolute bottom-[8%] left-[7%] h-[21%] w-[28%] -rotate-3 rounded-[22%] border-2 border-[#4A3028]/15 bg-white/95 shadow-sm"
      >
        <span className="absolute left-[18%] top-[28%] h-[12%] w-[52%] rounded-full bg-moss/70" />
        <span className="absolute left-[18%] top-[50%] h-[10%] w-[36%] rounded-full bg-berry/70" />
      </span>
    );
  }

  if (mood === "curious") {
    return (
      <span
        aria-hidden="true"
        className="absolute right-[8%] top-[10%] flex h-[22%] w-[22%] items-center justify-center rounded-full bg-white/90 shadow-sm"
      >
        <span className="h-[44%] w-[44%] rounded-full border-[3px] border-moss/75" />
      </span>
    );
  }

  return null;
}

export function CatMascot({
  mood = "happy",
  className = "",
  label,
  variant,
}: CatMascotProps) {
  const [randomIndex, setRandomIndex] = useState(0);
  const mascotSrc = useMemo(
    () => pickMascotSrc(variant, randomIndex),
    [randomIndex, variant],
  );

  useEffect(() => {
    if (variant === undefined) {
      setRandomIndex(Math.floor(Math.random() * mascotSrcs.length));
    }
  }, [variant]);

  return (
    <>
      {label ? <span className="sr-only">{label}</span> : null}
      <span
        className={`relative block aspect-square overflow-hidden rounded-[30%] bg-[#FFF4E4] ${className}`}
        data-mascot-kind="cat"
        data-mascot-variant={mascotSrc}
      >
        <Image
          src={mascotSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          fill
          sizes="(max-width: 640px) 160px, 320px"
          className="select-none object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute left-[13%] top-[11%] h-[10%] w-[10%] rounded-full bg-white/80 blur-[1px]"
        />
        <span
          aria-hidden="true"
          className="absolute left-[11%] top-[13%] h-[5%] w-[5%] rounded-full bg-white/95"
        />
        {moodAccessory(mood)}
      </span>
    </>
  );
}
