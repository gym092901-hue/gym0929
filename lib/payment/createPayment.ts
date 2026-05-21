import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getPaymentProvider } from "@/lib/payment/providers";
import { KakaoPayApiError } from "@/lib/payment/providers/kakaoPay";
import { PayPalApiError } from "@/lib/payment/providers/paypal";
import {
  getProductCatalogItem,
  getProductResultUrl,
} from "@/lib/products/catalog";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
} from "@/lib/payment/types";

function createPartnerId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const adapter = getPaymentProvider(input.provider);
  const supabase = getSupabaseAdmin();
  const paymentId = randomUUID();
  const product = getProductCatalogItem(input.productType);
  const amount = product.price;
  const currency = product.currency;
  const productName = product.name;
  const partnerOrderId = `mn_${input.productType}_${paymentId}`;
  let providerPayment;

  if (input.provider === "mock" && !isDemoModeEnabled()) {
    throw new Error("테스트 결제는 데모 환경에서만 사용할 수 있습니다.");
  }

  if (amount <= 0) {
    throw new Error("무료 제공 상품은 결제가 필요하지 않습니다.");
  }

  const { data: approvedPayment } = await supabase
    .from("payments")
    .select("id, reading_id, provider, status")
    .eq("reading_id", input.readingId)
    .eq("product_type", input.productType)
    .eq("status", "approved")
    .neq("provider", "mock")
    .limit(1)
    .maybeSingle();

  if (approvedPayment) {
    return {
      paymentId: approvedPayment.id,
      readingId: approvedPayment.reading_id,
      provider: approvedPayment.provider,
      status: approvedPayment.status,
      providerOrderId: null,
      nextUrl: getProductResultUrl(input.readingId, input.productType),
    };
  }

  const { data: reading, error: readingError } = await supabase
    .from("readings")
    .select("id, pet_id")
    .eq("id", input.readingId)
    .maybeSingle();

  if (readingError || !reading) {
    throw new Error("리포트 정보를 찾을 수 없습니다.");
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("owner_email")
    .eq("id", reading.pet_id)
    .maybeSingle();
  const ownerEmail = pet?.owner_email ?? null;
  const partnerUserId = ownerEmail
    ? createPartnerId("email", ownerEmail.toLowerCase())
    : createPartnerId("reading", input.readingId);

  const { error: insertError } = await supabase.from("payments").insert({
    id: paymentId,
    reading_id: input.readingId,
    provider: input.provider,
    product_type: input.productType,
    amount,
    currency,
    status: "ready",
    provider_order_id: partnerOrderId,
    partner_order_id: partnerOrderId,
    partner_user_id: partnerUserId,
    raw_request: {
      provider: input.provider,
      productType: input.productType,
      amount,
      currency,
      productName,
    },
  });

  if (insertError) {
    throw new Error("결제 준비 내역을 생성하지 못했습니다.");
  }

  try {
    providerPayment = await adapter.createPayment({
      paymentId,
      readingId: input.readingId,
      productType: input.productType,
      amount,
      currency,
      productName,
      partnerOrderId,
      partnerUserId,
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

    await supabase.from("payments").update({
      status: "failed",
      failed_at: new Date().toISOString(),
      raw_response: rawResponse,
    }).eq("id", paymentId);

    throw new Error("결제 준비 중 오류가 발생했습니다.");
  }

  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "pending",
      provider_order_id: providerPayment.providerOrderId,
      provider_tid: providerPayment.providerTid,
      provider_payment_id: providerPayment.providerPaymentId,
      partner_order_id: partnerOrderId,
      partner_user_id: partnerUserId,
      approval_url: providerPayment.approvalUrl,
      cancel_url: providerPayment.cancelUrl,
      fail_url: providerPayment.failUrl,
      raw_request: providerPayment.rawRequest,
      raw_response: providerPayment.rawResponse,
    })
    .eq("id", paymentId)
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
