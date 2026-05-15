import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSelectMaybeSingleMock } from "../helpers/supabaseMocks";

const { getSupabaseAdminMock, isSupabaseConfiguredMock } = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

describe("checkPaymentAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("NODE_ENV", "test");
    isSupabaseConfiguredMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("checks approved access by readingId and productType", async () => {
    const conditions: Array<{ method: string; column: string; value: unknown }> =
      [];

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() =>
        createSelectMaybeSingleMock(
          {
            data: {
              id: "payment-1",
              provider: "paypal",
              product_type: "pdf_report",
            },
            error: null,
          },
          conditions,
        ),
      ),
    });

    const { checkPaymentAccess } = await import(
      "@/lib/payment/checkPaymentAccess"
    );

    const result = await checkPaymentAccess("reading-1", "pdf_report");

    expect(conditions).toEqual([
      { method: "eq", column: "reading_id", value: "reading-1" },
      { method: "eq", column: "product_type", value: "pdf_report" },
      { method: "eq", column: "status", value: "approved" },
    ]);
    expect(result).toEqual({
      hasAccess: true,
      paymentId: "payment-1",
      provider: "paypal",
      productType: "pdf_report",
    });
  });

  it("returns no access when there is no approved payment", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() =>
        createSelectMaybeSingleMock({
          data: null,
          error: null,
        }),
      ),
    });

    const { checkPaymentAccess } = await import(
      "@/lib/payment/checkPaymentAccess"
    );

    await expect(checkPaymentAccess("reading-1", "premium_report")).resolves.toEqual({
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    });
  });

  it("allows local mock payments only when demo mode is enabled", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { createLocalApprovedPayment } = await import(
      "@/lib/payment/localPaymentStore"
    );
    const { checkPaymentAccess } = await import(
      "@/lib/payment/checkPaymentAccess"
    );

    const payment = createLocalApprovedPayment(
      "demo-local-reading",
      "premium_report",
    );

    await expect(
      checkPaymentAccess("demo-local-reading", "premium_report"),
    ).resolves.toEqual({
      hasAccess: true,
      paymentId: payment.id,
      provider: "mock",
      productType: "premium_report",
    });
  });

  it("blocks demo reading access when demo mode is disabled", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { createLocalApprovedPayment } = await import(
      "@/lib/payment/localPaymentStore"
    );
    const { checkPaymentAccess } = await import(
      "@/lib/payment/checkPaymentAccess"
    );

    createLocalApprovedPayment("demo-mong-2026", "premium_report");

    await expect(
      checkPaymentAccess("demo-mong-2026", "premium_report"),
    ).resolves.toEqual({
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    });
  });

  it("does not accept mock provider payments in production", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("NODE_ENV", "production");

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() =>
        createSelectMaybeSingleMock({
          data: {
            id: "payment-mock",
            provider: "mock",
            product_type: "premium_report",
          },
          error: null,
        }),
      ),
    });

    const { checkPaymentAccess } = await import(
      "@/lib/payment/checkPaymentAccess"
    );

    await expect(
      checkPaymentAccess("reading-prod", "premium_report"),
    ).resolves.toEqual({
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    });
  });
});
