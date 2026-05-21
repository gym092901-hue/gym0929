import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json, PaymentStatus } from "@/types/database";

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

export async function updatePaymentStatus({
  paymentId,
  readingId,
  status,
  rawResponse,
}: {
  paymentId: string;
  readingId?: string;
  status: Exclude<PaymentStatus, "approved" | "pending" | "ready">;
  rawResponse: Json;
}) {
  const supabase = getSupabaseAdmin();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, reading_id, product_type, status, raw_response")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error("결제 내역을 찾을 수 없습니다.");
  }

  if (payment.status === "approved") {
    return payment;
  }

  if (readingId && readingId !== payment.reading_id) {
    throw new Error("결제 정보가 리포트와 일치하지 않습니다.");
  }

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({
      status,
      ...(status === "failed" ? { failed_at: new Date().toISOString() } : {}),
      ...(status === "canceled" ? { canceled_at: new Date().toISOString() } : {}),
      ...(status === "refunded" ? { refunded_at: new Date().toISOString() } : {}),
      raw_response: mergeRawResponse(payment.raw_response, rawResponse),
    })
    .eq("id", paymentId)
    .select("id, reading_id, product_type, status, raw_response")
    .single();

  if (updateError || !updatedPayment) {
    throw new Error("결제 상태를 변경하지 못했습니다.");
  }

  return updatedPayment;
}
