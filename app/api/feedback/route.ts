import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { PetType } from "@/types/database";

export const runtime = "nodejs";

type FeedbackBody = {
  testerName?: unknown;
  contact?: unknown;
  petType?: unknown;
  page?: unknown;
  rating?: unknown;
  message?: unknown;
};

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRating(value: unknown) {
  const rating = typeof value === "number" ? value : Number(value);

  return Number.isInteger(rating) ? rating : null;
}

function normalizePetType(value: unknown): PetType | null {
  return value === "dog" || value === "cat" ? value : null;
}

export async function POST(request: NextRequest) {
  let body: FeedbackBody;

  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  const testerName = optionalText(body.testerName, 80);
  const contact = optionalText(body.contact, 120);
  const petType = normalizePetType(body.petType);
  const page = optionalText(body.page, 120) ?? "test";
  const rating = normalizeRating(body.rating);
  const message = requiredText(body.message);

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "만족도를 1점부터 5점 사이로 선택해 주세요." },
      { status: 400 },
    );
  }

  if (message.length < 5) {
    return NextResponse.json(
      { error: "피드백을 조금만 더 자세히 적어 주세요." },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "피드백은 2,000자 이내로 적어 주세요." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "피드백 저장을 위한 운영 DB가 아직 연결되지 않았어요." },
      { status: 503 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("feedbacks")
      .insert({
        tester_name: testerName,
        contact,
        pet_type: petType,
        page,
        rating,
        message,
        metadata: {
          source: "public_test_page",
          userAgent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
        },
      })
      .select("id, created_at")
      .single();

    if (error || !data) {
      console.error("Feedback insert failed", { error });
      return NextResponse.json(
        { error: "피드백 저장 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        feedbackId: data.id,
        createdAt: data.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Feedback route failed", { error });
    return NextResponse.json(
      { error: "피드백 저장 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
