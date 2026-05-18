import { CatMascot } from "@/components/mascot/CatMascot";
import { DogMascot } from "@/components/mascot/DogMascot";
import { PetSpeechBubble } from "@/components/mascot/PetSpeechBubble";
import type {
  MascotMood,
  MascotSize,
  MascotType,
} from "@/components/mascot/types";

type PetMascotProps = {
  type?: MascotType;
  species?: "dog" | "cat";
  mood?: MascotMood;
  size?: MascotSize;
  withBubble?: boolean;
  bubbleText?: string;
  label?: string;
  className?: string;
  decorative?: boolean;
};

const sizeClass: Record<MascotSize, string> = {
  sm: "w-14 sm:w-16",
  md: "w-24 sm:w-28",
  lg: "w-36 sm:w-44",
  hero: "w-full max-w-[25rem]",
};

function renderMascot({
  type,
  mood,
  className,
}: {
  type: "dog" | "cat";
  mood: MascotMood;
  className: string;
}) {
  return type === "dog" ? (
    <DogMascot mood={mood} className={className} />
  ) : (
    <CatMascot mood={mood} className={className} />
  );
}

export function PetMascot({
  type,
  species,
  mood = "happy",
  size = "md",
  withBubble = false,
  bubbleText,
  label,
  className = "",
  decorative,
}: PetMascotProps) {
  const resolvedType: MascotType = species ?? type ?? "dog";
  const showBubble = Boolean(withBubble || bubbleText);
  const accessibleLabel = label?.trim();
  const isDecorative = decorative ?? !showBubble;
  const shouldExposeLabel = decorative === false && Boolean(accessibleLabel);

  return (
    <figure
      className={`relative inline-flex flex-col items-center ${className}`}
      aria-hidden={isDecorative ? true : undefined}
      data-mascot={resolvedType}
      data-mascot-species={resolvedType === "both" ? "both" : resolvedType}
      data-mascot-role={isDecorative ? "decorative" : "meaningful"}
    >
      {shouldExposeLabel ? (
        <figcaption className="sr-only">{accessibleLabel}</figcaption>
      ) : null}

      {showBubble && bubbleText ? (
        <PetSpeechBubble className="mb-3 max-w-[15rem]">
          {bubbleText}
        </PetSpeechBubble>
      ) : null}

      {resolvedType === "both" ? (
        <div
          className={`mascot-float flex items-end justify-center -space-x-10 ${sizeClass[size]}`}
        >
          {renderMascot({
            type: "dog",
            mood,
            className: "w-[58%] drop-shadow-sm",
          })}
          {renderMascot({
            type: "cat",
            mood: mood === "payment" ? "holding-card" : mood,
            className: "w-[58%] drop-shadow-sm",
          })}
        </div>
      ) : (
        <div className={`mascot-float ${sizeClass[size]}`}>
          {renderMascot({
            type: resolvedType,
            mood,
            className: "w-full drop-shadow-sm",
          })}
        </div>
      )}
    </figure>
  );
}
