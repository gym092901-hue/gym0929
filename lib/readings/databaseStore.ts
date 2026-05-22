import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Database } from "@/types/database";
import type { PetLifestyleProfile, PetSpecies } from "@/types/reading";

type PetRow = Database["public"]["Tables"]["pets"]["Row"];
type ReadingRow = Database["public"]["Tables"]["readings"]["Row"];

export type DatabaseReadingWithPet = ReadingRow & {
  pets: PetRow | null;
};

type CreateDatabaseReadingInput = {
  name: string;
  type: PetSpecies;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  ownerEmail: string | null;
  freeSummary: string;
  lifestyle: PetLifestyleProfile;
};

type RawReadingRow = {
  id: string;
  pet_id: string;
  free_summary: string;
  premium_report: string | null;
  status: ReadingRow["status"];
  created_at: string;
  updated_at: string;
  p_id: string;
  p_name: string;
  p_type: PetSpecies;
  p_birth_date: string | null;
  p_birth_time: string | null;
  p_birth_time_unknown: boolean;
  p_adoption_date: string | null;
  p_owner_email: string | null;
  p_living_environment: string[] | null;
  p_daily_activity_frequency: string | null;
  p_alone_time: string | null;
  p_stranger_reaction: string | null;
  p_guardian_distance: string | null;
  p_favorite_activities: string[] | null;
  p_guardian_questions: string[] | null;
  p_created_at: string;
};

export function isDatabaseUrlConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function textArray(values: string[]) {
  if (values.length === 0) {
    return Prisma.sql`ARRAY[]::text[]`;
  }

  return Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;
}

function mapRawReading(row: RawReadingRow): DatabaseReadingWithPet {
  return {
    id: row.id,
    pet_id: row.pet_id,
    free_summary: row.free_summary,
    premium_report: row.premium_report,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    pets: {
      id: row.p_id,
      name: row.p_name,
      type: row.p_type,
      birth_date: row.p_birth_date,
      birth_time: row.p_birth_time,
      birth_time_unknown: row.p_birth_time_unknown,
      adoption_date: row.p_adoption_date,
      owner_email: row.p_owner_email,
      living_environment: row.p_living_environment ?? [],
      daily_activity_frequency: row.p_daily_activity_frequency,
      alone_time: row.p_alone_time,
      stranger_reaction: row.p_stranger_reaction,
      guardian_distance: row.p_guardian_distance,
      favorite_activities: row.p_favorite_activities ?? [],
      guardian_questions: row.p_guardian_questions ?? [],
      created_at: row.p_created_at,
    },
  };
}

export async function createDatabaseReading(input: CreateDatabaseReadingInput) {
  if (!isDatabaseUrlConfigured()) {
    throw new Error("DATABASE_URL이 설정되어 있지 않습니다.");
  }

  const pets = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    insert into public.pets (
      name,
      type,
      birth_date,
      birth_time,
      birth_time_unknown,
      adoption_date,
      owner_email,
      living_environment,
      daily_activity_frequency,
      alone_time,
      stranger_reaction,
      guardian_distance,
      favorite_activities,
      guardian_questions
    )
    values (
      ${input.name},
      ${input.type}::public.pet_type,
      ${input.birthDate}::date,
      ${input.birthTime}::time,
      ${input.birthTimeUnknown},
      ${input.adoptionDate}::date,
      ${input.ownerEmail},
      ${textArray(input.lifestyle.livingEnvironment)},
      ${input.lifestyle.dailyActivityFrequency},
      ${input.lifestyle.aloneTime},
      ${input.lifestyle.strangerReaction},
      ${input.lifestyle.guardianDistance},
      ${textArray(input.lifestyle.favoriteActivities)},
      ${textArray(input.lifestyle.guardianQuestions)}
    )
    returning id::text as id
  `);

  const pet = pets[0];

  if (!pet) {
    throw new Error("반려동물 정보를 저장하지 못했습니다.");
  }

  const readings = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    insert into public.readings (
      pet_id,
      free_summary,
      premium_report,
      status
    )
    values (
      ${pet.id}::uuid,
      ${input.freeSummary},
      null,
      'free_created'::public.reading_status
    )
    returning id::text as id
  `);

  const reading = readings[0];

  if (!reading) {
    throw new Error("무료 리포트를 생성하지 못했습니다.");
  }

  return {
    petId: pet.id,
    readingId: reading.id,
  };
}

export async function getDatabaseReadingRecord(readingId: string) {
  if (!isDatabaseUrlConfigured()) {
    return null;
  }

  try {
    const rows = await prisma.$queryRaw<RawReadingRow[]>(Prisma.sql`
      select
        r.id::text as id,
        r.pet_id::text as pet_id,
        r.free_summary,
        r.premium_report,
        r.status,
        r.created_at::text as created_at,
        r.updated_at::text as updated_at,
        p.id::text as p_id,
        p.name as p_name,
        p.type as p_type,
        p.birth_date::text as p_birth_date,
        p.birth_time::text as p_birth_time,
        p.birth_time_unknown as p_birth_time_unknown,
        p.adoption_date::text as p_adoption_date,
        p.owner_email as p_owner_email,
        p.living_environment as p_living_environment,
        p.daily_activity_frequency as p_daily_activity_frequency,
        p.alone_time as p_alone_time,
        p.stranger_reaction as p_stranger_reaction,
        p.guardian_distance as p_guardian_distance,
        p.favorite_activities as p_favorite_activities,
        p.guardian_questions as p_guardian_questions,
        p.created_at::text as p_created_at
      from public.readings r
      join public.pets p on p.id = r.pet_id
      where r.id = ${readingId}::uuid
      limit 1
    `);

    return rows[0] ? mapRawReading(rows[0]) : null;
  } catch (error) {
    console.error("[readings] direct database read failed", {
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export async function updateDatabasePremiumReport(
  readingId: string,
  premiumReport: string,
) {
  if (!isDatabaseUrlConfigured()) {
    return false;
  }

  const result = await prisma.$executeRaw(Prisma.sql`
    update public.readings
    set
      premium_report = ${premiumReport},
      status = 'premium_created'::public.reading_status,
      updated_at = now()
    where id = ${readingId}::uuid
  `);

  return result > 0;
}
