import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFreeSummaryMock,
  ensureProductPurchaseAllowedMock,
  getSupabaseAdminMock,
  isSupabaseConfiguredMock,
} = vi.hoisted(() => ({
  createFreeSummaryMock: vi.fn(),
  ensureProductPurchaseAllowedMock: vi.fn(),
  getSupabaseAdminMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/reports/free-summary", () => ({
  createFreeSummary: createFreeSummaryMock,
}));

vi.mock("@/lib/products/purchaseGuards", () => ({
  ensureProductPurchaseAllowed: ensureProductPurchaseAllowedMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

function createSampleReadingSupabaseMock(
  inserts: Array<{ table: string; payload: Record<string, unknown> }>,
) {
  return {
    from: vi.fn((table: string) => ({
      insert: vi.fn((payload: Record<string, unknown>) => {
        inserts.push({ table, payload });

        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data:
                table === "pets"
                  ? { id: "pet-1" }
                  : { id: "reading-1" },
              error: null,
            })),
          })),
        };
      }),
    })),
  };
}

function createApprovePaymentSupabaseMock(
  inserts: Array<{ table: string; payload: Record<string, unknown> }>,
) {
  const readingsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { id: "reading-1" },
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        neq: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  };

  const paymentsTable = {
    select: vi.fn(() => {
      const builder = {
        eq: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      };

      return builder;
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      inserts.push({ table: "payments", payload });

      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { id: "payment-1" },
            error: null,
          })),
        })),
      };
    }),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "readings") {
        return readingsTable;
      }

      if (table === "payments") {
        return paymentsTable;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("demo API routes", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    isSupabaseConfiguredMock.mockReturnValue(true);
    createFreeSummaryMock.mockReturnValue("몽이 무료 리포트");
    ensureProductPurchaseAllowedMock.mockResolvedValue({
      allowed: true,
      message: null,
    });
  });

  it("creates a sample pet and free reading only when demo mode is enabled", async () => {
    const inserts: Array<{ table: string; payload: Record<string, unknown> }> =
      [];
    getSupabaseAdminMock.mockReturnValue(createSampleReadingSupabaseMock(inserts));

    const { POST } = await import("@/app/api/demo/sample-reading/route");
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      petId: "pet-1",
      readingId: "reading-1",
      nextUrl: "/result/free/reading-1",
    });
    expect(inserts[0]).toMatchObject({
      table: "pets",
      payload: {
        name: "몽이",
        type: "dog",
        birth_date: "2021-05-14",
        birth_time: null,
        birth_time_unknown: true,
        adoption_date: "2021-08-20",
        owner_email: "test@example.com",
      },
    });
    expect(inserts[1]).toMatchObject({
      table: "readings",
      payload: {
        free_summary: "몽이 무료 리포트",
        premium_report: null,
        status: "free_created",
      },
    });
  });

  it("stores an approved mock payment with the server-side product price", async () => {
    const inserts: Array<{ table: string; payload: Record<string, unknown> }> =
      [];
    getSupabaseAdminMock.mockReturnValue(createApprovePaymentSupabaseMock(inserts));

    const { POST } = await import("@/app/api/demo/approve-payment/route");
    const response = await POST(
      new Request("http://test.local/api/demo/approve-payment", {
        method: "POST",
        body: JSON.stringify({
          readingId: "reading-1",
          productType: "premium_report",
          amount: 1,
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      paymentId: "payment-1",
      nextUrl: "/result/premium/reading-1",
    });
    expect(inserts[0]).toMatchObject({
      table: "payments",
      payload: {
        reading_id: "reading-1",
        provider: "mock",
        product_type: "premium_report",
        amount: 4900,
        currency: "KRW",
        status: "approved",
      },
    });
  });

  it("returns 404 when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const { POST } = await import("@/app/api/demo/sample-reading/route");
    const response = await POST();

    expect(response.status).toBe(404);
  });

  it("resets only the selected local mock payment in demo mode", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { createLocalApprovedPayment, getLocalApprovedPayment } = await import(
      "@/lib/payment/localPaymentStore"
    );
    createLocalApprovedPayment("reading-reset", "premium_report");
    createLocalApprovedPayment("reading-reset", "pdf_report");

    const { POST } = await import("@/app/api/demo/reset-payment/route");
    const response = await POST(
      new Request("http://test.local/api/demo/reset-payment", {
        method: "POST",
        body: JSON.stringify({
          readingId: "reading-reset",
          productType: "premium_report",
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      readingId: "reading-reset",
      productType: "premium_report",
      reset: true,
      storage: "local",
    });
    expect(getLocalApprovedPayment("reading-reset", "premium_report")).toBeNull();
    expect(getLocalApprovedPayment("reading-reset", "pdf_report")).not.toBeNull();
  });
});
