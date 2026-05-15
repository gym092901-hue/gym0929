import type { PaymentProviderAdapter } from "@/lib/payment/types";

export const mockPaymentProvider: PaymentProviderAdapter = {
  provider: "mock",
  async createPayment(input) {
    return {
      providerOrderId: `mock_order_${input.paymentId}`,
      providerTid: null,
      providerPaymentId: null,
      redirectUrl: `/checkout/${input.readingId}?productType=${input.productType}`,
      rawResponse: {
        demoMode: true,
        provider: "mock",
        action: "create",
        paymentId: input.paymentId,
      },
    };
  },
  async approvePayment(input) {
    return {
      status: "approved",
      providerPaymentId: `mock_approved_${input.paymentId}`,
      rawResponse: {
        demoMode: true,
        provider: "mock",
        action: "approve",
        paymentId: input.paymentId,
      },
    };
  },
  getMockSuccessUrl(input) {
    return `/result/premium/${input.readingId}`;
  },
};
