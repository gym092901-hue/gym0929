import { getLocalReading, updateLocalReadingPremiumSections } from "@/lib/readings/localReadingStore";
import {
  createFreeInsightSections,
  createFreeKeywords,
  createPremiumPreviewSections,
} from "@/lib/readings/content";
import {
  emptyLifestyleProfile,
  normalizeLifestyleProfile,
} from "@/lib/readings/lifestyle";
import {
  getDatabaseReadingRecord,
  updateDatabasePremiumReport,
} from "@/lib/readings/databaseStore";
import { demoReadingId, isDemoModeEnabled } from "@/lib/demo/config";
import { generateFreePetSajuReading } from "@/lib/saju/petSajuEngine";
import {
  generatePremiumReport,
  sanitizePremiumReport,
} from "@/lib/saju/premiumReportGenerator";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { PetLifestyleProfile, Reading } from "@/types/reading";

export { demoReadingId };

const demoPet = {
  name: "몽이",
  type: "dog" as const,
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
  ownerEmail: "test@example.com",
  lifestyle: {
    livingEnvironment: ["with_family", "mostly_indoor"],
    dailyActivityFrequency: "once",
    aloneTime: "one_to_three",
    strangerReaction: "observes_carefully",
    guardianDistance: "moderately_close",
    favoriteActivities: ["walk", "treat_search"],
    guardianQuestions: ["personality", "bond", "routine"],
  } satisfies PetLifestyleProfile,
};

const demoFreeReading = generateFreePetSajuReading({
  name: demoPet.name,
  type: demoPet.type,
  birthDate: demoPet.birthDate,
  birthTime: demoPet.birthTime,
  birthTimeUnknown: demoPet.birthTimeUnknown,
  adoptionDate: demoPet.adoptionDate,
  lifestyle: demoPet.lifestyle,
});

let cachedDemoPremiumSections: Reading["premiumSections"] | null = null;

type PetRow = Database["public"]["Tables"]["pets"]["Row"];
type ReadingRow = Database["public"]["Tables"]["readings"]["Row"];
type ReadingWithPet = ReadingRow & {
  pets: PetRow | null;
};

function createSectionInput({
  name,
  type,
  birthDate,
  birthTime,
  birthTimeUnknown,
  adoptionDate,
  freeSummary,
  lifestyle,
}: {
  name: string;
  type: PetRow["type"];
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  freeSummary?: string;
  lifestyle?: Reading["lifestyle"];
}) {
  return {
    name,
    type,
    birthDate,
    birthTime,
    birthTimeUnknown,
    adoptionDate,
    freeSummary,
    lifestyle: lifestyle ?? emptyLifestyleProfile,
  };
}

function createPremiumSections(premiumReport: string | null, petName?: string) {
  if (!premiumReport) {
    return [];
  }

  const safePremiumReport = petName
    ? sanitizePremiumReport(premiumReport, petName)
    : premiumReport;

  return safePremiumReport
    .split(/\n(?=\d+\.\s)/)
    .filter(Boolean)
    .map((section, index) => {
      const [rawTitle, ...bodyLines] = section.trim().split("\n");
      const title =
        rawTitle?.replace(/^\d+\.\s*/, "").trim() ||
        `심층 리포트 ${index + 1}`;
      const body = bodyLines.join("\n").trim() || section.trim();

      return {
        title,
        body,
      };
    });
}

function generatePremiumSectionsForReading(reading: Reading) {
  const report = generatePremiumReport({
    name: reading.petName,
    type: reading.species,
    birthDate: reading.birthDate || reading.metDate || null,
    birthTime: reading.birthTime,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
    freeSummary: reading.freeSummary,
    lifestyle: reading.lifestyle,
  }).report;

  return createPremiumSections(report);
}

function createDemoReading(premiumSections: Reading["premiumSections"] = []): Reading {
  const sectionInput = createSectionInput({
    name: demoPet.name,
    type: demoPet.type,
    birthDate: demoPet.birthDate,
    birthTime: demoPet.birthTime,
    birthTimeUnknown: demoPet.birthTimeUnknown,
    adoptionDate: demoPet.adoptionDate,
    freeSummary: demoFreeReading.report,
    lifestyle: demoPet.lifestyle,
  });

  return {
    id: demoReadingId,
    petName: demoPet.name,
    species: demoPet.type,
    birthDate: demoPet.birthDate,
    birthTime: demoPet.birthTime,
    adoptionDate: demoPet.adoptionDate,
    metDate: demoPet.adoptionDate,
    guardianEmail: demoPet.ownerEmail,
    freeSummary: demoFreeReading.report,
    freeKeywords: createFreeKeywords(sectionInput),
    freeSections: createFreeInsightSections(sectionInput),
    premiumPreviewSections: createPremiumPreviewSections(sectionInput),
    lifestyle: demoPet.lifestyle,
    premiumSections,
  };
}

function getDemoReading() {
  return createDemoReading(cachedDemoPremiumSections ?? []);
}

function getDemoPremiumReading() {
  const reading = getDemoReading();

  if (!cachedDemoPremiumSections) {
    cachedDemoPremiumSections = generatePremiumSectionsForReading(reading);
  }

  return createDemoReading(cachedDemoPremiumSections);
}

export async function getReadingRecord(readingId: string) {
  if (!isSupabaseConfigured()) {
    return getDatabaseReadingRecord(readingId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("readings")
    .select(
      "id, pet_id, free_summary, premium_report, status, created_at, updated_at, pets(id, name, type, birth_date, birth_time, birth_time_unknown, adoption_date, owner_email, living_environment, daily_activity_frequency, alone_time, stranger_reaction, guardian_distance, favorite_activities, guardian_questions, created_at)",
    )
    .eq("id", readingId)
    .returns<ReadingWithPet[]>()
    .maybeSingle();

  if (error || !data) {
    return getDatabaseReadingRecord(readingId);
  }

  return data;
}

async function savePremiumReport(readingId: string, premiumReport: string) {
  if (!isSupabaseConfigured()) {
    const savedWithDatabase = await updateDatabasePremiumReport(
      readingId,
      premiumReport,
    );

    if (!savedWithDatabase) {
      throw new Error("프리미엄 리포트를 저장하지 못했습니다.");
    }

    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("readings")
    .update({
      premium_report: premiumReport,
      status: "premium_created",
    })
    .eq("id", readingId);

  if (error) {
    const savedWithDatabase = await updateDatabasePremiumReport(
      readingId,
      premiumReport,
    );

    if (!savedWithDatabase) {
      throw new Error("프리미엄 리포트를 저장하지 못했습니다.");
    }
  }
}

export async function getOrCreatePremiumReading(readingId: string) {
  const localReading = getLocalReading(readingId);

  if (localReading) {
    if (localReading.premiumSections.length > 0) {
      return localReading;
    }

    const premiumSections = generatePremiumSectionsForReading(localReading);
    return updateLocalReadingPremiumSections(readingId, premiumSections);
  }

  if (readingId === demoReadingId) {
    return isDemoModeEnabled() ? getDemoPremiumReading() : null;
  }

  if (!isSupabaseConfigured()) {
    const databaseRow = await getDatabaseReadingRecord(readingId);

    if (!databaseRow) {
      return isDemoModeEnabled() ? getDemoPremiumReading() : null;
    }

    if (!databaseRow.premium_report && databaseRow.pets) {
      const premiumReport = generatePremiumReport({
        name: databaseRow.pets.name,
        type: databaseRow.pets.type,
        birthDate: databaseRow.pets.birth_date,
        birthTime: databaseRow.pets.birth_time,
        birthTimeUnknown: databaseRow.pets.birth_time_unknown,
        adoptionDate: databaseRow.pets.adoption_date,
        freeSummary: databaseRow.free_summary,
        lifestyle: normalizeLifestyleProfile(databaseRow.pets),
      }).report;

      await updateDatabasePremiumReport(readingId, premiumReport);

      return mapReading({
        ...databaseRow,
        premium_report: premiumReport,
        status: "premium_created",
      });
    }

    return mapReading(databaseRow);
  }

  const row = await getReadingRecord(readingId);

  if (!row || !row.pets) {
    return null;
  }

  if (row.premium_report) {
    return mapReading(row);
  }

  const premiumReport = generatePremiumReport({
    name: row.pets.name,
    type: row.pets.type,
    birthDate: row.pets.birth_date,
    birthTime: row.pets.birth_time,
    birthTimeUnknown: row.pets.birth_time_unknown,
    adoptionDate: row.pets.adoption_date,
    freeSummary: row.free_summary,
    lifestyle: normalizeLifestyleProfile(row.pets),
  }).report;

  await savePremiumReport(readingId, premiumReport);

  return mapReading({
    ...row,
    premium_report: premiumReport,
    status: "premium_created",
  });
}

function mapReading(row: ReadingWithPet): Reading {
  const pet = row.pets;
  const petName = pet?.name ?? "우리 아이";
  const species = pet?.type ?? "dog";
  const birthTimeUnknown = pet?.birth_time_unknown ?? true;
  const birthTime = birthTimeUnknown ? null : pet?.birth_time ?? null;
  const lifestyle = pet ? normalizeLifestyleProfile(pet) : emptyLifestyleProfile;
  const sectionInput = createSectionInput({
    name: petName,
    type: species,
    birthDate: pet?.birth_date ?? null,
    birthTime,
    birthTimeUnknown,
    adoptionDate: pet?.adoption_date ?? null,
    freeSummary: row.free_summary,
    lifestyle,
  });

  return {
    id: row.id,
    petName,
    species,
    birthDate: pet?.birth_date ?? "",
    birthTime,
    adoptionDate: pet?.adoption_date ?? "",
    metDate: pet?.adoption_date ?? pet?.birth_date ?? "",
    guardianEmail: pet?.owner_email ?? "",
    freeSummary: row.free_summary,
    freeKeywords: createFreeKeywords(sectionInput),
    freeSections: createFreeInsightSections(sectionInput),
    premiumPreviewSections: createPremiumPreviewSections(sectionInput),
    lifestyle,
    premiumSections: createPremiumSections(row.premium_report, petName),
  };
}

export async function getReading(readingId: string) {
  const localReading = getLocalReading(readingId);

  if (localReading) {
    return localReading;
  }

  if (readingId === demoReadingId) {
    return isDemoModeEnabled() ? getDemoReading() : null;
  }

  if (!isSupabaseConfigured()) {
    const databaseRow = await getDatabaseReadingRecord(readingId);

    if (!databaseRow) {
      return isDemoModeEnabled() ? getDemoReading() : null;
    }

    return mapReading(databaseRow);
  }

  const data = await getReadingRecord(readingId);

  if (!data) {
    return null;
  }

  return mapReading(data);
}

export function getSpeciesLabel(species: Reading["species"]) {
  return species === "dog" ? "강아지" : "고양이";
}
