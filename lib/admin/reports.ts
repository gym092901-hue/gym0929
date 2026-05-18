import "server-only";

import { normalizeLifestyleProfile } from "@/lib/readings/lifestyle";
import { generatePremiumReport } from "@/lib/saju/premiumReportGenerator";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function regeneratePremiumReport(readingId: string) {
  const supabase = getSupabaseAdmin();
  const { data: reading, error: readingError } = await supabase
    .from("readings")
    .select(
      "id, free_summary, pets(name, type, birth_date, birth_time, birth_time_unknown, adoption_date, living_environment, daily_activity_frequency, alone_time, stranger_reaction, guardian_distance, favorite_activities, guardian_questions)",
    )
    .eq("id", readingId)
    .maybeSingle();

  if (readingError || !reading || !reading.pets) {
    throw new Error("리포트 정보를 찾을 수 없습니다.");
  }

  const premiumReport = generatePremiumReport({
    name: reading.pets.name,
    type: reading.pets.type,
    birthDate: reading.pets.birth_date,
    birthTime: reading.pets.birth_time,
    birthTimeUnknown: reading.pets.birth_time_unknown,
    adoptionDate: reading.pets.adoption_date,
    freeSummary: reading.free_summary,
    lifestyle: normalizeLifestyleProfile(reading.pets),
  }).report;

  const { error: updateError } = await supabase
    .from("readings")
    .update({
      premium_report: premiumReport,
      status: "premium_created",
    })
    .eq("id", reading.id);

  if (updateError) {
    throw new Error("유료 리포트를 다시 저장하지 못했습니다.");
  }

  return {
    readingId: reading.id,
    characters: premiumReport.length,
  };
}
