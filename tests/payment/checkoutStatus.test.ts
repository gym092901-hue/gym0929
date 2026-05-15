import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminMock, isSupabaseConfiguredMock } = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

function createPaymentStatusMock(data: unknown) {
  const conditions: Array<{ column: string; value: unknown }> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      conditions.push({ column, value });
      return builder;
    }),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };

  return {
    conditions,
    supabase: {
      from: vi.fn(() => builder),
    },
  };
}

describe("getCheckoutPaymentStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("separates unpaid and pending checkout states", async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    const { conditions, supabase } = createPaymentStatusMock({
      id: "payment-pending",
      provider: "kakaopay",
      status: "pending",
    });
    getSupabaseAdminMock.mockReturnValue(supabase);

    const { getCheckoutPaymentStatus } = await import(
      "@/lib/payment/checkoutStatus"
    );
    const result = await getCheckoutPaymentStatus("reading-1", "premium_report");

    expect(result).toMatchObject({
      state: "pending",
      label: "결제 대기",
      paymentId: "payment-pending",
      provider: "kakaopay",
      rawStatus: "pending",
      canStartPayment: false,
    });
    expect(conditions).toEqual([
      { column: "reading_id", value: "reading-1" },
      { column: "product_type", value: "premium_report" },
    ]);
  });

  it("marks local mock approvals as demo payments only in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { createLocalApprovedPayment } = await import(
      "@/lib/payment/localPaymentStore"
    );
    const { getCheckoutPaymentStatus } = await import(
      "@/lib/payment/checkoutStatus"
    );
    const payment = createLocalApprovedPayment("reading-demo", "premium_report");

    await expect(
      getCheckoutPaymentStatus("reading-demo", "premium_report"),
    ).resolves.toMatchObject({
      state: "demo_approved",
      label: "데모 결제 완료",
      paymentId: payment.id,
      provider: "mock",
      rawStatus: "approved",
      canStartPayment: false,
    });
  });

  it("does not treat mock provider rows as paid outside demo mode", async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    const { supabase } = createPaymentStatusMock({
      id: "payment-mock",
      provider: "mock",
      status: "approved",
    });
    getSupabaseAdminMock.mockReturnValue(supabase);

    const { getCheckoutPaymentStatus } = await import(
      "@/lib/payment/checkoutStatus"
    );

    await expect(
      getCheckoutPaymentStatus("reading-prod", "premium_report"),
    ).resolves.toMatchObject({
      state: "unpaid",
      label: "미결제",
      paymentId: null,
      provider: null,
      rawStatus: null,
      canStartPayment: true,
    });
  });
});
