import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

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

export async function recordFailedPaymentRecheck(paymentId: string) {
  const supabase = getSupabaseAdmin();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, status, raw_response")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    throw new Error("결제 내역을 찾을 수 없습니다.");
  }

  if (payment.status !== "failed") {
    return {
      status: payment.status,
      changed: false,
    };
  }

  const rawResponse = mergeRawResponse(payment.raw_response, {
    admin_recheck: {
      checked_at: new Date().toISOString(),
      result: "provider_status_query_not_connected",
      note: "현재는 결제수단별 상태 조회 연결이 준비되지 않아 실패 상태를 유지합니다.",
    },
  });

  const { data: updatedPayment, error: updateError } = await supabase
    .from("payments")
    .update({ raw_response: rawResponse })
    .eq("id", payment.id)
    .select("id, status")
    .single();

  if (updateError || !updatedPayment) {
    throw new Error("결제 재확인 기록을 저장하지 못했습니다.");
  }

  return {
    status: updatedPayment.status,
    changed: true,
  };
}
