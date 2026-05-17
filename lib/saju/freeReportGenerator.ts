import { createFreeSummary } from "@/lib/reports/free-summary";
import { generatePetHookFromSajuInput } from "@/lib/saju/petHookGenerator";
import { generateFreePetSajuReading, type PetSajuInput } from "@/lib/saju/petSajuEngine";

export function generateFreeReport(input: PetSajuInput) {
  const freeReading = generateFreePetSajuReading(input);
  const hook = generatePetHookFromSajuInput(input);

  return {
    ...freeReading,
    hook,
    freeSummary: createFreeSummary(input),
  };
}

export { createFreeSummary };
