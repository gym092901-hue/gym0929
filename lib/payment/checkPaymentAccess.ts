import "server-only";

import { isDemoModeEnabled, isDemoReadingId } from "@/lib/demo/config";
import { getLocalApprovedPayment } from "@/lib/payment/localPaymentStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { PaymentProvider, ProductType } from "@/types/database";

export type PaymentAccessResult = {
  hasAccess: boolean;
  paymentId: string | null;
  provider: PaymentProvider | null;
  productType: ProductType | null;
};

export async function checkPaymentAccess(
  readingId: string,
  productType: ProductType = "premium_report",
): Promise<PaymentAccessResult> {
  const demoModeEnabled = isDemoModeEnabled();

  if (isDemoReadingId(readingId) && !demoModeEnabled) {
    return {
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    };
  }

  const localPayment = demoModeEnabled
    ? getLocalApprovedPayment(readingId, productType)
    : null;

  if (localPayment) {
    return {
      hasAccess: true,
      paymentId: localPayment.id,
      provider: localPayment.provider,
      productType: localPayment.productType,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payments")
    .select("id, provider, product_type")
    .eq("reading_id", readingId)
    .eq("product_type", productType)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    };
  }

  if (data.provider === "mock" && !demoModeEnabled) {
    return {
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    };
  }

  return {
    hasAccess: true,
    paymentId: data.id,
    provider: data.provider,
    productType: data.product_type,
  };
}
