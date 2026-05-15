import { NextRequest, NextResponse } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { approvePayment } from "@/lib/payment/approvePayment";

export const runtime = "nodejs";

type PayPalCaptureOrderBody = {
  orderId?: unknown;
  paymentId?: unknown;
};

export async function POST(request: NextRequest) {
  if (isDemoModeEnabled()) {
    return NextResponse.json(
      { error: "DEMO_MODE에서는 실제 PayPal capture API를 호출하지 않습니다." },
      { status: 403 },
    );
  }

  let body: PayPalCaptureOrderBody;

  try {
    body = (await request.json()) as PayPalCaptureOrderBody;
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (typeof body.orderId !== "string" || !body.orderId) {
    return NextResponse.json(
      { error: "orderId가 필요합니다." },
      { status: 400 },
    );
  }

  if (typeof body.paymentId !== "string" || !body.paymentId) {
    return NextResponse.json(
      { error: "paymentId가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const payment = await approvePayment({
      provider: "paypal",
      paymentId: body.paymentId,
      providerPayload: {
        orderId: body.orderId,
      },
    });

    return NextResponse.json({
      resultUrl: payment.nextUrl,
      premiumUrl: payment.nextUrl,
      paymentId: payment.paymentId,
      status: payment.status,
    });
  } catch (error) {
    console.error("PayPal capture order route failed", {
      orderId: body.orderId,
      paymentId: body.paymentId,
      error,
    });

    return NextResponse.json(
      { error: "페이팔 결제 승인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
