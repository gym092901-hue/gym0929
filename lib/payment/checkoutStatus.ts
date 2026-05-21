import "server-only";

import { isDemoModeEnabled } from "@/lib/demo/config";
import { getLocalApprovedPayment } from "@/lib/payment/localPaymentStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  PaymentProvider,
  PaymentStatus,
  ProductType,
} from "@/types/database";

export type CheckoutState =
  | "unpaid"
  | "pending"
  | "approved"
  | "demo_approved"
  | "failed"
  | "canceled";

export type CheckoutPaymentStatus = {
  state: CheckoutState;
  label: string;
  description: string;
  paymentId: string | null;
  provider: PaymentProvider | null;
  rawStatus: PaymentStatus | null;
  canStartPayment: boolean;
};

function createStatus(
  status: Omit<CheckoutPaymentStatus, "canStartPayment"> & {
    canStartPayment?: boolean;
  },
): CheckoutPaymentStatus {
  return {
    ...status,
    canStartPayment:
      status.canStartPayment ??
      ["unpaid", "failed", "canceled"].includes(status.state),
  };
}

function statusText(
  rawStatus: PaymentStatus,
  provider: PaymentProvider,
): Pick<CheckoutPaymentStatus, "state" | "label" | "description"> {
  if (rawStatus === "approved" && provider === "mock") {
    return {
      state: "demo_approved",
      label: "데모 결제 완료",
      description:
        "테스트 결제가 승인되어 데모 환경에서만 결과 페이지를 열 수 있습니다.",
    };
  }

  if (rawStatus === "approved") {
    return {
      state: "approved",
      label: "결제 완료",
      description:
        "서버에서 승인된 결제 내역을 확인했습니다. 구매한 콘텐츠를 열람할 수 있습니다.",
    };
  }

  if (rawStatus === "ready" || rawStatus === "pending") {
    return {
      state: "pending",
      label: "결제 대기",
      description:
        "결제 준비 내역이 생성되어 승인 결과를 기다리는 중입니다. 결제창을 완료한 뒤 결과 페이지로 이동됩니다.",
    };
  }

  if (rawStatus === "failed" || rawStatus === "refunded") {
    return {
      state: "failed",
      label: rawStatus === "refunded" ? "환불 완료" : "결제실패",
      description:
        rawStatus === "refunded"
          ? "환불 처리된 결제입니다. 다시 이용하려면 새 결제가 필요합니다."
          : "이전 결제가 완료되지 않았습니다. 확인 항목을 다시 선택한 뒤 새 결제를 시작할 수 있습니다.",
    };
  }

  return {
    state: "canceled",
    label: "결제취소",
    description:
      "이전 결제가 취소되었습니다. 필요한 경우 이 페이지에서 다시 결제할 수 있습니다.",
  };
}

export async function getCheckoutPaymentStatus(
  readingId: string,
  productType: ProductType,
): Promise<CheckoutPaymentStatus> {
  const demoModeEnabled = isDemoModeEnabled();
  const localPayment = demoModeEnabled
    ? getLocalApprovedPayment(readingId, productType)
    : null;

  if (localPayment) {
    return createStatus({
      state: "demo_approved",
      label: "데모 결제 완료",
      description:
        "테스트 결제가 승인되어 데모 환경에서만 결과 페이지를 열 수 있습니다.",
      paymentId: localPayment.id,
      provider: localPayment.provider,
      rawStatus: "approved",
      canStartPayment: false,
    });
  }

  if (!isSupabaseConfigured()) {
    return createStatus({
      state: "unpaid",
      label: "미결제",
      description:
        "아직 이 상품에 대해 승인된 결제 내역이 없습니다. 결제 전 확인 후 결제를 시작해 주세요.",
      paymentId: null,
      provider: null,
      rawStatus: null,
    });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payments")
    .select("id, provider, status")
    .eq("reading_id", readingId)
    .eq("product_type", productType)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return createStatus({
      state: "unpaid",
      label: "미결제",
      description:
        "아직 이 상품에 대해 승인된 결제 내역이 없습니다. 결제 전 확인 후 결제를 시작해 주세요.",
      paymentId: null,
      provider: null,
      rawStatus: null,
    });
  }

  if (data.provider === "mock" && !demoModeEnabled) {
    return createStatus({
      state: "unpaid",
      label: "미결제",
      description:
        "테스트 결제 내역은 데모 환경에서만 인정됩니다. 실제 서비스에서는 정식 결제를 진행해 주세요.",
      paymentId: null,
      provider: null,
      rawStatus: null,
    });
  }

  const text = statusText(data.status, data.provider);

  return createStatus({
    ...text,
    paymentId: data.id,
    provider: data.provider,
    rawStatus: data.status,
    canStartPayment: text.state !== "pending" && text.state !== "approved" && text.state !== "demo_approved",
  });
}
