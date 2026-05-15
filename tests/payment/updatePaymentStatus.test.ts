import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Json, PaymentStatus } from "@/types/database";

type PaymentState = {
  id: string;
  reading_id: string;
  status: PaymentStatus;
  raw_response: Json | null;
};

const { getSupabaseAdminMock } = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

describe("updatePaymentStatus", () => {
  let paymentState: PaymentState;
  const paymentUpdates: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    paymentUpdates.length = 0;
    paymentState = {
      id: "payment-1",
      reading_id: "reading-1",
      status: "pending",
      raw_response: { ready: { ok: true } },
    };

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== "payments") {
          throw new Error(`Unexpected table: ${table}`);
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: paymentState,
                error: null,
              })),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            paymentUpdates.push(payload);
            paymentState = {
              ...paymentState,
              status: payload.status as PaymentStatus,
              raw_response: payload.raw_response as Json,
            };

            return {
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: paymentState,
                    error: null,
                  })),
                })),
              })),
            };
          }),
        };
      }),
    });
  });

  it("marks a pending KakaoPay redirect as failed and keeps raw response history", async () => {
    const { updatePaymentStatus } = await import("@/lib/payment/updatePaymentStatus");

    const result = await updatePaymentStatus({
      paymentId: "payment-1",
      readingId: "reading-1",
      status: "failed",
      rawResponse: {
        fail: {
          provider: "kakaopay",
        },
      },
    });

    expect(result.status).toBe("failed");
    expect(paymentUpdates[0]).toEqual({
      status: "failed",
      raw_response: {
        ready: { ok: true },
        fail: { provider: "kakaopay" },
      },
    });
  });

  it("does not overwrite an already approved payment", async () => {
    paymentState.status = "approved";

    const { updatePaymentStatus } = await import("@/lib/payment/updatePaymentStatus");

    const result = await updatePaymentStatus({
      paymentId: "payment-1",
      readingId: "reading-1",
      status: "failed",
      rawResponse: {
        fail: {
          provider: "kakaopay",
        },
      },
    });

    expect(result.status).toBe("approved");
    expect(paymentUpdates).toEqual([]);
  });
});
