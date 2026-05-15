import { NextRequest, NextResponse } from "next/server";
import {
  getDemoDisabledResponse,
  isDemoModeEnabled,
} from "@/lib/demo/config";
import { deleteLocalApprovedPayment } from "@/lib/payment/localPaymentStore";
import { isProductType } from "@/lib/products/catalog";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DemoResetPaymentBody = {
  readingId?: unknown;
  productType?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(getDemoDisabledResponse(), { status: 404 });
  }

  let body: DemoResetPaymentBody;

  try {
    body = (await request.json()) as DemoResetPaymentBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const readingId = typeof body.readingId === "string" ? body.readingId : "";
  const productType = isProductType(body.productType)
    ? body.productType
    : null;

  if (!readingId) {
    return NextResponse.json(
      { error: "readingId가 필요합니다." },
      { status: 400 },
    );
  }

  if (!productType) {
    return NextResponse.json(
      { error: "지원하지 않는 상품 유형입니다." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    const removed = deleteLocalApprovedPayment(readingId, productType);

    return NextResponse.json({
      readingId,
      productType,
      reset: removed,
      storage: "local",
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("payments")
      .update({
        status: "canceled",
        raw_response: {
          demoMode: true,
          provider: "mock",
          action: "reset_payment",
          productType,
          canceledAt: new Date().toISOString(),
        },
      })
      .eq("reading_id", readingId)
      .eq("product_type", productType)
      .eq("provider", "mock");

    if (error) {
      console.error("Demo mock payment reset failed", {
        readingId,
        productType,
        error,
      });

      return NextResponse.json(
        { error: "데모 결제 상태를 초기화하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      readingId,
      productType,
      reset: true,
      storage: "supabase",
    });
  } catch (error) {
    console.error("Demo mock payment reset failed", {
      readingId,
      productType,
      error,
    });

    return NextResponse.json(
      { error: "데모 결제 상태 초기화 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
