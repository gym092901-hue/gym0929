import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentProviderAdapter } from "@/lib/payment/types";

const { getPaymentProviderMock, getSupabaseAdminMock, providerCreatePayment } =
  vi.hoisted(() => ({
    getPaymentProviderMock: vi.fn(),
    getSupabaseAdminMock: vi.fn(),
    providerCreatePayment: vi.fn(),
  }));

vi.mock("@/lib/payment/providers", () => ({
  getPaymentProvider: getPaymentProviderMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

describe("createPayment", () => {
  const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const readingUpdates: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    inserts.length = 0;
    readingUpdates.length = 0;

    providerCreatePayment.mockResolvedValue({
      providerOrderId: "order-123",
      providerTid: "tid-123",
      providerPaymentId: null,
      redirectUrl: "https://pay.example/redirect",
      rawResponse: { ready: { tid: "tid-123" } },
    });

    getPaymentProviderMock.mockReturnValue({
      provider: "kakaopay",
      createPayment: providerCreatePayment,
      approvePayment: vi.fn(),
      getMockSuccessUrl: vi.fn(),
    } satisfies PaymentProviderAdapter);

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "payments") {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              inserts.push({ table, payload });

              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: {
                      id: payload.id,
                      reading_id: payload.reading_id,
                      provider: payload.provider,
                      status: payload.status,
                    },
                    error: null,
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

  it("creates a pending payment using provider tid/order data", async () => {
    const { createPayment } = await import("@/lib/payment/createPayment");

    const result = await createPayment({
      provider: "kakaopay",
      readingId: "reading-1",
      productType: "premium_report",
      amount: 4900,
      currency: "KRW",
      productName: "우리 아이 심층 사주 리포트",
    });

    expect(providerCreatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        readingId: "reading-1",
        productType: "premium_report",
        amount: 4900,
        currency: "KRW",
      }),
    );
    expect(inserts[0]).toMatchObject({
      table: "payments",
      payload: {
        reading_id: "reading-1",
        provider: "kakaopay",
        product_type: "premium_report",
        amount: 4900,
        currency: "KRW",
        status: "pending",
        provider_order_id: "order-123",
        provider_tid: "tid-123",
        raw_response: { ready: { tid: "tid-123" } },
      },
    });
    expect(readingUpdates).toEqual([{ status: "payment_pending" }]);
    expect(result).toMatchObject({
      readingId: "reading-1",
      provider: "kakaopay",
      status: "pending",
      providerOrderId: "order-123",
      nextUrl: "https://pay.example/redirect",
    });
  });
});
