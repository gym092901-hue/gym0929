import type { PetType } from "@/types/database";
import { generateFreePetSajuReading } from "@/lib/saju/petSajuEngine";

type FreeSummaryInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
};

export function createFreeSummary(input: FreeSummaryInput) {
  return generateFreePetSajuReading({
    name: input.name,
    type: input.type,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: input.birthTimeUnknown,
    adoptionDate: input.adoptionDate,
  }).report;
}
