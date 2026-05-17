import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getDemoDisabledResponse,
  isDemoModeEnabled,
} from "@/lib/demo/config";
import { createLocalApprovedPayment } from "@/lib/payment/localPaymentStore";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import {
  getProductCatalogItem,
  getProductResultUrl,
  isProductType,
} from "@/lib/products/catalog";
import { getLocalReading } from "@/lib/readings/localReadingStore";
import { demoReadingId } from "@/lib/readings";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DemoApprovePaymentBody = {
  readingId?: unknown;
  productType?: unknown;
};

export async function POST(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return NextResponse.json(getDemoDisabledResponse(), { status: 404 });
  }

  let body: DemoApprovePaymentBody;

  try {
    body = (await request.json()) as DemoApprovePaymentBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const readingId = typeof body.readingId === "string" ? body.readingId : "";
  const productType = isProductType(body.productType)
    ? body.productType
    : "premium_report";

  if (!readingId) {
    return NextResponse.json(
      { error: "readingId가 필요합니다." },
      { status: 400 },
    );
  }

  const product = getProductCatalogItem(productType);

  if (product.prerequisite) {
    const prerequisiteAccess = await checkPaymentAccess(
      readingId,
      product.prerequisite,
    );

    if (!prerequisiteAccess.hasAccess) {
      const prerequisite = getProductCatalogItem(product.prerequisite);

      return NextResponse.json(
        {
          error:
            product.price === 0
              ? `${product.name}는 ${prerequisite.name} 결제 후 이용할 수 있습니다.`
              : `${product.name}는 ${prerequisite.name} 결제 후 구매할 수 있습니다.`,
        },
        { status: 403 },
      );
    }
  }

  if (!isSupabaseConfigured()) {
    if (!getLocalReading(readingId) && readingId !== demoReadingId) {
      return NextResponse.json(
        { error: "테스트 결제를 연결할 리포트를 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const payment = createLocalApprovedPayment(readingId, productType);

    return NextResponse.json({
      paymentId: payment.id,
      nextUrl: getProductResultUrl(readingId, productType),
      storage: "local",
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: reading, error: readingError } = await supabase
      .from("readings")
      .select("id")
      .eq("id", readingId)
      .maybeSingle();

    if (readingError || !reading) {
      return NextResponse.json(
        { error: "테스트 결제를 연결할 리포트를 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const { data: approvedPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("reading_id", readingId)
      .eq("product_type", productType)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (approvedPayment) {
      return NextResponse.json({
        paymentId: approvedPayment.id,
        nextUrl: getProductResultUrl(readingId, productType),
      });
    }

    const paymentId = randomUUID();
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        id: paymentId,
        reading_id: readingId,
        provider: "mock",
        product_type: productType,
        amount: product.price,
        currency: product.currency,
        status: "approved",
        provider_order_id: `mock_order_${paymentId}`,
        provider_tid: null,
        provider_payment_id: `mock_approved_${paymentId}`,
        raw_response: {
          demoMode: true,
          provider: "mock",
          action: "approve_payment",
          productType,
          amount: product.price,
          currency: product.currency,
          approvedAt: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      console.error("Demo payment insert failed", paymentError);

      return NextResponse.json(
        { error: "테스트 결제 승인 내역을 저장하지 못했습니다." },
        { status: 500 },
      );
    }

    await supabase
      .from("readings")
      .update({ status: "paid" })
      .eq("id", readingId)
      .neq("status", "premium_created");

    return NextResponse.json({
      paymentId: payment.id,
      nextUrl: getProductResultUrl(readingId, productType),
    });
  } catch (error) {
    console.error("Demo payment approval failed", error);

    return NextResponse.json(
      { error: "테스트 결제 승인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
