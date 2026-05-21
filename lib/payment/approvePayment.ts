import "server-only";

import { getPaymentProvider } from "@/lib/payment/providers";
import { KakaoPayApiError } from "@/lib/payment/providers/kakaoPay";
import { PayPalApiError } from "@/lib/payment/providers/paypal";
import {
  getProductCatalogItem,
  getProductResultUrl,
} from "@/lib/products/catalog";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type {
  ApprovePaymentInput,
  ApprovePaymentResult,
} from "@/lib/payment/types";

function mergeRawResponse(current: Json | null, next: Json): Json {
  if (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    next &&
    typeof next === "object" &&
    !Array.isArray(next)
  ) {
    return {
      ...current,
      ...next,
    };
  }

  return next;
}

export async function approvePayment(
  input: ApprovePaymentInput,
): Promise<ApprovePaymentResult> {
  const supabase = getSupabaseAdmin();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, reading_id, provider, product_type, amount, currency, status, provider_order_id, provider_tid, provider_payment_id, partner_order_id, partner_user_id, raw_response",
    )
    .eq("id", input.paymentId)
    .eq("provider", input.provider)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error("결제 내역을 찾을 수 없습니다.");
  }

  if (payment.status === "approved") {
    return {
      paymentId: payment.id,
      readingId: payment.reading_id,
      provider: payment.provider,
      status: payment.status,
      nextUrl: getProductResultUrl(payment.reading_id, payment.product_type),
    };
  }

  if (payment.status !== "pending") {
    throw new Error("승인 가능한 결제 대기 상태가 아닙니다.");
  }

  const product = getProductCatalogItem(payment.product_type);

  if (
    payment.amount !== product.price ||
    payment.currency.toUpperCase() !== product.currency.toUpperCase()
  ) {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        raw_response: mergeRawResponse(payment.raw_response, {
          validation: {
            error: "payment amount mismatch",
            expectedAmount: product.price,
            expectedCurrency: product.currency,
            storedAmount: payment.amount,
            storedCurrency: payment.currency,
          },
        }),
      })
      .eq("id", payment.id);

    throw new Error("결제 금액 정보가 상품 가격과 일치하지 않습니다.");
  }

  const payloadReadingId =
    input.providerPayload &&
    typeof input.providerPayload === "object" &&
    !Array.isArray(input.providerPayload) &&
    typeof input.providerPayload.readingId === "string"
      ? input.providerPayload.readingId
      : null;

  if (payloadReadingId && payloadReadingId !== payment.reading_id) {
    throw new Error("결제 정보가 리포트와 일치하지 않습니다.");
  }

  const adapter = getPaymentProvider(input.provider);
  let approval;

  try {
    approval = await adapter.approvePayment({
      paymentId: payment.id,
      providerOrderId: payment.provider_order_id,
      providerTid: payment.provider_tid,
      providerPaymentId: payment.provider_payment_id,
      partnerOrderId: payment.partner_order_id,
      partnerUserId: payment.partner_user_id,
      expectedAmount: product.price,
      expectedCurrency: product.currency,
      providerPayload: {
        ...(input.providerPayload &&
        typeof input.providerPayload === "object" &&
        !Array.isArray(input.providerPayload)
          ? input.providerPayload
          : {}),
        readingId: payment.reading_id,
      },
    });
  } catch (error) {
    const rawResponse =
      error instanceof KakaoPayApiError || error instanceof PayPalApiError
        ? error.rawResponse
        : {
            approve: {
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown payment provider error",
            },
          };

    console.error("Payment provider approve failed", {
      provider: input.provider,
      paymentId: payment.id,
      readingId: payment.reading_id,
      error,
    });

    await supabase
      .from("payments")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        raw_response: mergeRawResponse(payment.raw_response, rawResponse),
      })
      .eq("id", payment.id);

    throw new Error("결제 승인에 실패했습니다.");
  }

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({
      status: approval.status,
      provider_payment_id: approval.providerPaymentId,
      approved_at: new Date().toISOString(),
      raw_response: mergeRawResponse(payment.raw_response, approval.rawResponse),
    })
    .eq("id", payment.id)
    .select("id, reading_id, provider, product_type, status")
    .single();

  if (updateError || !updatedPayment) {
    throw new Error("결제 승인 상태를 저장하지 못했습니다.");
  }

  await supabase
    .from("readings")
    .update({ status: "paid" })
    .eq("id", updatedPayment.reading_id)
    .neq("status", "premium_created");

  return {
    paymentId: updatedPayment.id,
    readingId: updatedPayment.reading_id,
    provider: updatedPayment.provider,
    status: updatedPayment.status,
    nextUrl: getProductResultUrl(
      updatedPayment.reading_id,
      updatedPayment.product_type,
    ),
  };
}
