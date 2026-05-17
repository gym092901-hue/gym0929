import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPaymentMock,
  ensureProductPurchaseAllowedMock,
  getSupabaseAdminMock,
} = vi.hoisted(() => ({
  createPaymentMock: vi.fn(),
  ensureProductPurchaseAllowedMock: vi.fn(),
  getSupabaseAdminMock: vi.fn(),
}));

vi.mock("@/lib/payment/createPayment", () => ({
  createPayment: createPaymentMock,
}));

vi.mock("@/lib/products/purchaseGuards", () => ({
  ensureProductPurchaseAllowed: ensureProductPurchaseAllowedMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

function createRouteSupabaseMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "readings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: "reading-1" },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === "products") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    product_type: "premium_report",
                    name: "우리 아이 심층 사주 리포트",
                    price: 2900,
                    currency: "KRW",
                    active: true,
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("payment API routes", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "false";
    getSupabaseAdminMock.mockReturnValue(createRouteSupabaseMock());
    ensureProductPurchaseAllowedMock.mockResolvedValue({
      allowed: true,
      message: null,
    });
  });

  it("KakaoPay ready creates payment with server product price, not client amount", async () => {
    createPaymentMock.mockResolvedValue({
      paymentId: "payment-1",
      readingId: "reading-1",
      provider: "kakaopay",
      status: "pending",
      providerOrderId: "order-1",
      nextUrl: "https://kakaopay.example/redirect",
    });

    const { POST } = await import("@/app/api/payments/kakao/ready/route");
    const response = await POST(
      new Request("http://test.local/api/payments/kakao/ready", {
        method: "POST",
        body: JSON.stringify({
          readingId: "reading-1",
          productType: "premium_report",
          amount: 1,
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toEqual({
      paymentId: "payment-1",
      redirectUrl: "https://kakaopay.example/redirect",
    });
    expect(createPaymentMock).toHaveBeenCalledWith({
      provider: "kakaopay",
      readingId: "reading-1",
      productType: "premium_report",
      amount: 2900,
      currency: "KRW",
      productName: "우리 아이 심층 사주 리포트",
    });
  });

  it("PayPal create-order stores provider order through the common payment creator", async () => {
    createPaymentMock.mockResolvedValue({
      paymentId: "payment-1",
      readingId: "reading-1",
      provider: "paypal",
      status: "pending",
      providerOrderId: "paypal-order-1",
      nextUrl: "/payment/paypal/success",
    });

    const { POST } = await import(
      "@/app/api/payments/paypal/create-order/route"
    );
    const response = await POST(
      new Request("http://test.local/api/payments/paypal/create-order", {
        method: "POST",
        body: JSON.stringify({
          readingId: "reading-1",
          productType: "premium_report",
          amount: 1,
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toEqual({
      orderId: "paypal-order-1",
      paymentId: "payment-1",
    });
    expect(createPaymentMock).toHaveBeenCalledWith({
      provider: "paypal",
      readingId: "reading-1",
      productType: "premium_report",
      amount: 2900,
      currency: "KRW",
      productName: "우리 아이 심층 사주 리포트",
    });
  });

  it("blocks real provider routes while demo mode is enabled", async () => {
    process.env.DEMO_MODE = "true";
    const { POST } = await import("@/app/api/payments/kakao/ready/route");

    const response = await POST(
      new Request("http://test.local/api/payments/kakao/ready", {
        method: "POST",
        body: JSON.stringify({
          readingId: "reading-1",
          productType: "premium_report",
        }),
      }) as never,
    );

    expect(response.status).toBe(403);
    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it("disables the legacy common approve endpoint", async () => {
    const { POST } = await import("@/app/api/payments/approve/route");
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("비활성화"),
    });
  });

  it("disables the legacy common create endpoint", async () => {
    const { POST } = await import("@/app/api/payments/create/route");
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("비활성화"),
    });
  });
});
