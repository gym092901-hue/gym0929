import "server-only";

import { randomUUID } from "node:crypto";
import { getPaymentProvider } from "@/lib/payment/providers";
import { KakaoPayApiError } from "@/lib/payment/providers/kakaoPay";
import { PayPalApiError } from "@/lib/payment/providers/paypal";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
} from "@/lib/payment/types";

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const adapter = getPaymentProvider(input.provider);
  const supabase = getSupabaseAdmin();
  const paymentId = randomUUID();
  let providerPayment;

  try {
    providerPayment = await adapter.createPayment({
      paymentId,
      readingId: input.readingId,
      productType: input.productType,
      amount: input.amount,
      currency: input.currency,
      productName: input.productName,
    });
  } catch (error) {
    const rawResponse =
      error instanceof KakaoPayApiError || error instanceof PayPalApiError
        ? error.rawResponse
        : {
            error:
              error instanceof Error
                ? error.message
                : "Unknown payment provider error",
          };

    console.error("Payment provider ready failed", {
      provider: input.provider,
      readingId: input.readingId,
      productType: input.productType,
      error,
    });

    await supabase.from("payments").insert({
      id: paymentId,
      reading_id: input.readingId,
      provider: input.provider,
      product_type: input.productType,
      amount: input.amount,
      currency: input.currency,
      status: "failed",
      provider_order_id: paymentId,
      raw_response: rawResponse,
    });

    throw new Error("결제 준비 중 오류가 발생했습니다.");
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      id: paymentId,
      reading_id: input.readingId,
      provider: input.provider,
      product_type: input.productType,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      provider_order_id: providerPayment.providerOrderId,
      provider_tid: providerPayment.providerTid,
      provider_payment_id: providerPayment.providerPaymentId,
      raw_response: providerPayment.rawResponse,
    })
    .select("id, reading_id, provider, status")
    .single();

  if (error || !data) {
    throw new Error("결제 대기 내역을 생성하지 못했습니다.");
  }

  await supabase
    .from("readings")
    .update({ status: "payment_pending" })
    .eq("id", input.readingId)
    .neq("status", "premium_created");

  return {
    paymentId: data.id,
    readingId: data.reading_id,
    provider: data.provider,
    status: data.status,
    providerOrderId: providerPayment.providerOrderId,
    nextUrl:
      providerPayment.redirectUrl ??
      adapter.getMockSuccessUrl({
        paymentId: data.id,
        readingId: data.reading_id,
      }),
  };
}
