import { PetMascot } from "@/components/mascot/PetMascot";
import { PawPattern } from "@/components/mascot/PawPattern";
import type { MascotType } from "@/components/mascot/types";

type FloatingPetsProps = {
  className?: string;
  type?: MascotType;
};

export function FloatingPets({ className = "", type = "both" }: FloatingPetsProps) {
  const firstType = type === "both" ? "cat" : type;
  const secondType = type === "both" ? "dog" : type;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <PawPattern className="absolute right-0 top-0 h-56 w-80 opacity-55" />
      <div className="absolute -right-8 top-24 hidden rotate-6 opacity-70 lg:block">
        <PetMascot type={firstType} mood="sleepy" size="md" />
      </div>
      <div className="absolute -left-7 bottom-8 hidden -rotate-6 opacity-65 xl:block">
        <PetMascot type={secondType} mood="star" size="md" />
      </div>
    </div>
  );
}
