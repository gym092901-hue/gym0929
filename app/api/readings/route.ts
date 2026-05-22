import { NextRequest, NextResponse } from "next/server";
import { isDemoModeEnabled, isProductionRuntime } from "@/lib/demo/config";
import { normalizeLifestyleProfile } from "@/lib/readings/lifestyle";
import { createFreeSummary } from "@/lib/reports/free-summary";
import { createDatabaseReading, isDatabaseUrlConfigured } from "@/lib/readings/databaseStore";
import { createLocalReading } from "@/lib/readings/localReadingStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { PetType } from "@/types/database";

export const runtime = "nodejs";

type CreateReadingBody = {
  name?: unknown;
  type?: unknown;
  birth_date?: unknown;
  birth_date_unknown?: unknown;
  birth_time?: unknown;
  birth_time_unknown?: unknown;
  adoption_date?: unknown;
  owner_email?: unknown;
  living_environment?: unknown;
  daily_activity_frequency?: unknown;
  alone_time?: unknown;
  stranger_reaction?: unknown;
  guardian_distance?: unknown;
  favorite_activities?: unknown;
  guardian_questions?: unknown;
};

function asOptionalDate(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value;
}

function asOptionalTime(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value;
}

function isPetType(value: unknown): value is PetType {
  return value === "dog" || value === "cat";
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDate(value: string | null) {
  return Boolean(value) && value! > todayDateString();
}

function canUseLocalReadingFallback() {
  return process.env.NODE_ENV === "development" || isDemoModeEnabled();
}

export async function POST(request: NextRequest) {
  let body: CreateReadingBody;

  try {
    body = (await request.json()) as CreateReadingBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  const ownerEmail =
    typeof body.owner_email === "string"
      ? body.owner_email.trim().toLowerCase() || null
      : null;
  const birthDateUnknown = body.birth_date_unknown === true;
  const birthDate = birthDateUnknown ? null : asOptionalDate(body.birth_date);
  const birthTimeUnknown = body.birth_time_unknown === true;
  const birthTime = birthTimeUnknown ? null : asOptionalTime(body.birth_time);
  const adoptionDate = asOptionalDate(body.adoption_date);
  const lifestyle = normalizeLifestyleProfile(body);

  if (!name) {
    return NextResponse.json(
      { error: "우리 아이 이름을 입력해 주세요." },
      { status: 400 },
    );
  }

  if (name.length > 30) {
    return NextResponse.json(
      { error: "이름은 30자 이내로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (!isPetType(type)) {
    return NextResponse.json(
      { error: "강아지인지 고양이인지 알려주세요." },
      { status: 400 },
    );
  }

  if (isFutureDate(birthDate) || isFutureDate(adoptionDate)) {
    return NextResponse.json(
      { error: "미래 날짜는 사용할 수 없어요." },
      { status: 400 },
    );
  }

  if (!birthDate && !adoptionDate) {
    return NextResponse.json(
      { error: "생일을 모른다면 처음 만난 날을 알려주세요." },
      { status: 400 },
    );
  }

  if (birthDateUnknown && !adoptionDate) {
    return NextResponse.json(
      { error: "생일을 모른다면 처음 만난 날을 알려주세요." },
      { status: 400 },
    );
  }

  if (ownerEmail && !validateEmail(ownerEmail)) {
    return NextResponse.json(
      { error: "이메일 형식을 다시 확인해 주세요." },
      { status: 400 },
    );
  }

  if (ownerEmail && ownerEmail.length > 254) {
    return NextResponse.json(
      { error: "이메일 주소가 너무 길어요. 다시 확인해 주세요." },
      { status: 400 },
    );
  }

  const freeSummary = createFreeSummary({
    name,
    type,
    birthDate,
    birthTime,
    birthTimeUnknown,
    adoptionDate,
    lifestyle,
  });

  if (!isSupabaseConfigured()) {
    if (isProductionRuntime() || !canUseLocalReadingFallback()) {
      console.error("[readings] Supabase is not configured in production runtime.");

      return NextResponse.json(
        { error: "운영 데이터베이스 설정이 필요합니다." },
        { status: 500 },
      );
    }

    const localReading = createLocalReading({
      name,
      type,
      birthDate,
      birthTime,
      birthTimeUnknown,
      adoptionDate,
      ownerEmail,
      freeSummary,
      lifestyle,
    });

    return NextResponse.json({
      readingId: localReading.readingId,
      petId: localReading.petId,
      storage: "local",
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: pet, error: petError } = await supabase
      .from("pets")
      .insert({
        name,
        type,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_time_unknown: birthTimeUnknown,
        adoption_date: adoptionDate,
        owner_email: ownerEmail,
        living_environment: lifestyle.livingEnvironment,
        daily_activity_frequency: lifestyle.dailyActivityFrequency,
        alone_time: lifestyle.aloneTime,
        stranger_reaction: lifestyle.strangerReaction,
        guardian_distance: lifestyle.guardianDistance,
        favorite_activities: lifestyle.favoriteActivities,
        guardian_questions: lifestyle.guardianQuestions,
      })
      .select("id")
      .single();

    if (petError || !pet) {
      console.error("[readings] pet insert failed", {
        code: petError?.code,
        message: petError?.message,
        details: petError?.details,
        hint: petError?.hint,
      });

      if (isDatabaseUrlConfigured()) {
        try {
          const databaseReading = await createDatabaseReading({
            name,
            type,
            birthDate,
            birthTime,
            birthTimeUnknown,
            adoptionDate,
            ownerEmail,
            freeSummary,
            lifestyle,
          });

          return NextResponse.json({
            readingId: databaseReading.readingId,
            petId: databaseReading.petId,
            storage: "database",
          });
        } catch (databaseError) {
          console.error("[readings] direct database fallback failed", {
            error:
              databaseError instanceof Error
                ? databaseError.message
                : databaseError,
          });
        }
      }

      return NextResponse.json(
        { error: "반려동물 정보를 저장하지 못했습니다." },
        { status: 500 },
      );
    }

    const { data: reading, error: readingError } = await supabase
      .from("readings")
      .insert({
        pet_id: pet.id,
        free_summary: freeSummary,
        premium_report: null,
        status: "free_created",
      })
      .select("id")
      .single();

    if (readingError || !reading) {
      console.error("[readings] reading insert failed", {
        code: readingError?.code,
        message: readingError?.message,
        details: readingError?.details,
        hint: readingError?.hint,
      });

      return NextResponse.json(
        { error: "무료 리포트를 생성하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      readingId: reading.id,
      petId: pet.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
