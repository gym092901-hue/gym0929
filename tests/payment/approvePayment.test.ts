import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Json } from "@/types/database";
import type { PaymentProviderAdapter } from "@/lib/payment/types";

type PaymentState = {
  id: string;
  reading_id: string;
  provider: "kakaopay";
  product_type: "premium_report";
  status: "pending" | "approved" | "failed" | "canceled";
  provider_order_id: string | null;
  provider_tid: string | null;
  provider_payment_id: string | null;
  raw_response: Json | null;
};

const { getPaymentProviderMock, getSupabaseAdminMock, providerApprovePayment } =
  vi.hoisted(() => ({
    getPaymentProviderMock: vi.fn(),
    getSupabaseAdminMock: vi.fn(),
    providerApprovePayment: vi.fn(),
  }));

vi.mock("@/lib/payment/providers", () => ({
  getPaymentProvider: getPaymentProviderMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

describe("approvePayment", () => {
  let paymentState: PaymentState;
  const paymentUpdates: Array<Record<string, unknown>> = [];
  const readingUpdates: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    paymentUpdates.length = 0;
    readingUpdates.length = 0;
    paymentState = {
      id: "payment-1",
      reading_id: "reading-1",
      provider: "kakaopay",
      product_type: "premium_report",
      status: "pending",
      provider_order_id: "order-1",
      provider_tid: "tid-1",
      provider_payment_id: null,
      raw_response: { ready: { tid: "tid-1" } },
    };

    providerApprovePayment.mockResolvedValue({
      status: "approved",
      providerPaymentId: "aid-1",
      rawResponse: { approve: { aid: "aid-1" } },
    });

    getPaymentProviderMock.mockReturnValue({
      provider: "kakaopay",
      createPayment: vi.fn(),
      approvePayment: providerApprovePayment,
      getMockSuccessUrl: vi.fn(),
    } satisfies PaymentProviderAdapter);

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "payments") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: paymentState,
                    error: null,
                  })),
                })),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              paymentUpdates.push(payload);
              paymentState = {
                ...paymentState,
                status:
                  (payload.status as PaymentState["status"] | undefined) ??
                  paymentState.status,
                provider_payment_id:
                  (payload.provider_payment_id as string | null) ??
                  paymentState.provider_payment_id,
                raw_response: payload.raw_response as Json,
              };

              return {
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(async () => ({
                      data: {
                        id: paymentState.id,
                        reading_id: paymentState.reading_id,
                        provider: paymentState.provider,
                        product_type: paymentState.product_type,
                        status: paymentState.status,
                      },
                      error: null,
                    })),
                  })),
                })),
              };
            }),
          };
        }

        if (table === "readings") {
          return {
            update: vi.fn((payload: Record<string, unknown>) => {
              readingUpdates.push(payload);

              return {
                eq: vi.fn(() => ({
                  neq: vi.fn(async () => ({ data: null, error: null })),
                })),
              };
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });
  });

  it("approves a pending payment and updates the reading status", async () => {
    const { approvePayment } = await import("@/lib/payment/approvePayment");

    const result = await approvePayment({
      provider: "kakaopay",
      paymentId: "payment-1",
      providerPayload: {
        pg_token: "pg-token",
        readingId: "reading-1",
      },
    });

    expect(providerApprovePayment).toHaveBeenCalledWith({
      paymentId: "payment-1",
      providerOrderId: "order-1",
      providerTid: "tid-1",
      providerPaymentId: null,
      providerPayload: {
        pg_token: "pg-token",
        readingId: "reading-1",
      },
    });
    expect(paymentUpdates[0]).toMatchObject({
      status: "approved",
      provider_payment_id: "aid-1",
      raw_response: {
        ready: { tid: "tid-1" },
        approve: { aid: "aid-1" },
      },
    });
    expect(readingUpdates).toEqual([{ status: "paid" }]);
    expect(result).toEqual({
      paymentId: "payment-1",
      readingId: "reading-1",
      provider: "kakaopay",
      status: "approved",
      nextUrl: "/result/premium/reading-1",
    });
  });

  it("does not call the provider again when payment is already approved", async () => {
    paymentState.status = "approved";

    const { approvePayment } = await import("@/lib/payment/approvePayment");

    const result = await approvePayment({
      provider: "kakaopay",
      paymentId: "payment-1",
      providerPayload: {
        pg_token: "pg-token",
        readingId: "reading-1",
      },
    });

    expect(providerApprovePayment).not.toHaveBeenCalled();
    expect(paymentUpdates).toEqual([]);
    expect(readingUpdates).toEqual([]);
    expect(result).toMatchObject({
      paymentId: "payment-1",
      status: "approved",
      nextUrl: "/result/premium/reading-1",
    });
  });

  it("keeps a pending payment retryable when provider approval fails", async () => {
    providerApprovePayment.mockRejectedValueOnce(new Error("temporary failure"));

    const { approvePayment } = await import("@/lib/payment/approvePayment");

    await expect(
      approvePayment({
        provider: "kakaopay",
        paymentId: "payment-1",
        providerPayload: {
          pg_token: "bad-token",
          readingId: "reading-1",
        },
      }),
    ).rejects.toThrow();

    expect(paymentUpdates[0]).toEqual({
      raw_response: {
        ready: { tid: "tid-1" },
        approve: { error: "temporary failure" },
      },
    });
    expect(paymentState.status).toBe("pending");
    expect(readingUpdates).toEqual([]);
  });
});
