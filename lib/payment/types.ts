import type { Json, ProductType } from "@/types/database";

export type PaymentProvider = "kakaopay" | "paypal" | "mock";

export type PaymentStatus =
  | "ready"
  | "pending"
  | "approved"
  | "failed"
  | "canceled"
  | "refunded";

export type CreatePaymentInput = {
  provider: PaymentProvider;
  readingId: string;
  productType: ProductType;
  amount: number;
  currency: string;
  productName?: string;
};

export type CreateProviderPaymentInput = Omit<CreatePaymentInput, "provider"> & {
  paymentId: string;
  partnerOrderId: string;
  partnerUserId: string;
};

export type CreateProviderPaymentResult = {
  providerOrderId: string;
  providerTid: string | null;
  providerPaymentId: string | null;
  redirectUrl: string | null;
  approvalUrl: string | null;
  cancelUrl: string | null;
  failUrl: string | null;
  rawRequest: Json;
  rawResponse: Json;
};

export type CreatePaymentResult = {
  paymentId: string;
  readingId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerOrderId: string | null;
  nextUrl: string;
};

export type ApprovePaymentInput = {
  provider: PaymentProvider;
  paymentId: string;
  providerPayload?: Json;
};

export type ApproveProviderPaymentInput = {
  paymentId: string;
  providerOrderId: string | null;
  providerTid: string | null;
  providerPaymentId: string | null;
  partnerOrderId: string | null;
  partnerUserId: string | null;
  expectedAmount: number;
  expectedCurrency: string;
  providerPayload?: Json;
};

export type ApproveProviderPaymentResult = {
  status: Extract<PaymentStatus, "approved">;
  providerPaymentId: string | null;
  rawResponse: Json;
};

export type ApprovePaymentResult = {
  paymentId: string;
  readingId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  nextUrl: string;
};

export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult>;
  approvePayment(
    input: ApproveProviderPaymentInput,
  ): Promise<ApproveProviderPaymentResult>;
  getMockSuccessUrl(input: { paymentId: string; readingId: string }): string;
};
