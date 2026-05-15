import { NextResponse } from "next/server";
import { demoSamplePet, getDemoDisabledResponse, isDemoModeEnabled } from "@/lib/demo/config";
import { createLocalReading } from "@/lib/readings/localReadingStore";
import { createFreeSummary } from "@/lib/reports/free-summary";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(getDemoDisabledResponse(), { status: 404 });
  }

  const freeSummary = createFreeSummary({
    name: demoSamplePet.name,
    type: demoSamplePet.type,
    birthDate: demoSamplePet.birthDate,
    birthTime: demoSamplePet.birthTime,
    birthTimeUnknown: demoSamplePet.birthTimeUnknown,
    adoptionDate: demoSamplePet.adoptionDate,
  });

  if (!isSupabaseConfigured()) {
    const localReading = createLocalReading({
      name: demoSamplePet.name,
      type: demoSamplePet.type,
      birthDate: demoSamplePet.birthDate,
      birthTime: demoSamplePet.birthTime,
      birthTimeUnknown: demoSamplePet.birthTimeUnknown,
      adoptionDate: demoSamplePet.adoptionDate,
      ownerEmail: demoSamplePet.ownerEmail,
      freeSummary,
    });

    return NextResponse.json({
      petId: localReading.petId,
      readingId: localReading.readingId,
      nextUrl: `/result/free/${localReading.readingId}`,
      storage: "local",
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: pet, error: petError } = await supabase
      .from("pets")
      .insert({
        name: demoSamplePet.name,
        type: demoSamplePet.type,
        birth_date: demoSamplePet.birthDate,
        birth_time: demoSamplePet.birthTime,
        birth_time_unknown: demoSamplePet.birthTimeUnknown,
        adoption_date: demoSamplePet.adoptionDate,
        owner_email: demoSamplePet.ownerEmail,
      })
      .select("id")
      .single();

    if (petError || !pet) {
      console.error("Demo pet insert failed", petError);

      return NextResponse.json(
        { error: "샘플 반려동물 정보를 저장하지 못했습니다." },
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
      console.error("Demo reading insert failed", readingError);

      return NextResponse.json(
        { error: "샘플 무료 리포트를 생성하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      petId: pet.id,
      readingId: reading.id,
      nextUrl: `/result/free/${reading.id}`,
    });
  } catch (error) {
    console.error("Demo sample reading failed", error);

    return NextResponse.json(
      { error: "데모 리포트를 생성하는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
