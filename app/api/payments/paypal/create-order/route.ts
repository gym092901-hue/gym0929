import { NextRequest, NextResponse } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { createPayment } from "@/lib/payment/createPayment";
import { isProductType } from "@/lib/products/catalog";
import { ensureProductPurchaseAllowed } from "@/lib/products/purchaseGuards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PayPalCreateOrderBody = {
  readingId?: unknown;
  productType?: unknown;
};

export async function POST(request: NextRequest) {
  if (isDemoModeEnabled()) {
    return NextResponse.json(
      { error: "DEMO_MODE에서는 실제 PayPal Orders API를 호출하지 않습니다." },
      { status: 403 },
    );
  }

  let body: PayPalCreateOrderBody;

  try {
    body = (await request.json()) as PayPalCreateOrderBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (typeof body.readingId !== "string" || !body.readingId) {
    return NextResponse.json(
      { error: "readingId가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isProductType(body.productType)) {
    return NextResponse.json(
      { error: "지원하지 않는 상품 유형입니다." },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: reading, error: readingError } = await supabase
      .from("readings")
      .select("id")
      .eq("id", body.readingId)
      .maybeSingle();

    if (readingError || !reading) {
      return NextResponse.json(
        { error: "리포트 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const purchaseGuard = await ensureProductPurchaseAllowed(
      body.readingId,
      body.productType,
    );

    if (!purchaseGuard.allowed) {
      return NextResponse.json(
        { error: purchaseGuard.message },
        { status: 403 },
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("product_type, name, price, currency, active")
      .eq("product_type", body.productType)
      .eq("active", true)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "결제 가능한 상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const payment = await createPayment({
      provider: "paypal",
      readingId: body.readingId,
      productType: product.product_type,
      amount: product.price,
      currency: product.currency,
      productName: product.name,
    });

    return NextResponse.json({
      orderId: payment.providerOrderId,
      paymentId: payment.paymentId,
    });
  } catch (error) {
    console.error("PayPal create order route failed", {
      readingId: body.readingId,
      productType: body.productType,
      error,
    });

    return NextResponse.json(
      { error: "페이팔 주문 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
