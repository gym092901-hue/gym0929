import type { PetType } from "@/types/database";
import type { PetLifestyleProfile } from "@/types/reading";
import { generatePetHookFromSajuInput } from "@/lib/saju/petHookGenerator";
import { generateFreePetSajuReading } from "@/lib/saju/petSajuEngine";
import { sanitizeReportText } from "@/lib/reports/sanitizeReportText";

type FreeSummaryInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  lifestyle?: PetLifestyleProfile;
};

export function createFreeSummary(input: FreeSummaryInput) {
  const sajuInput = {
    name: input.name,
    type: input.type,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: input.birthTimeUnknown,
    adoptionDate: input.adoptionDate,
    lifestyle: input.lifestyle,
  };
  const hook = generatePetHookFromSajuInput(sajuInput);
  const report = [
    `첫 문장 결론\n${hook.hookSentence}\n${hook.hookSubcopy}`,
    generateFreePetSajuReading(sajuInput).report,
  ].join("\n\n");

  return sanitizeReportText(report, {
    context: "free_summary",
    petName: input.name,
  });
}
