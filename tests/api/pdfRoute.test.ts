import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkPaymentAccessMock,
  createPremiumReportPdfMock,
  getOrCreatePremiumReadingMock,
} = vi.hoisted(() => ({
  checkPaymentAccessMock: vi.fn(),
  createPremiumReportPdfMock: vi.fn(),
  getOrCreatePremiumReadingMock: vi.fn(),
}));

vi.mock("@/lib/payment/checkPaymentAccess", () => ({
  checkPaymentAccess: checkPaymentAccessMock,
}));

vi.mock("@/lib/pdf/createPremiumReportPdf", () => ({
  createPremiumReportPdf: createPremiumReportPdfMock,
}));

vi.mock("@/lib/readings", () => ({
  getOrCreatePremiumReading: getOrCreatePremiumReadingMock,
}));

function createParams(readingId = "reading-1") {
  return {
    params: Promise.resolve({ readingId }),
  };
}

describe("GET /api/pdf/[readingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 before premium_report is approved", async () => {
    checkPaymentAccessMock.mockResolvedValueOnce({
      hasAccess: false,
      paymentId: null,
      provider: null,
      productType: null,
    });

    const { GET } = await import("@/app/api/pdf/[readingId]/route");
    const response = await GET(new Request("http://test.local"), createParams());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "심층 리포트 결제 후 PDF를 다운로드할 수 있습니다.",
    });
    expect(checkPaymentAccessMock).toHaveBeenCalledWith(
      "reading-1",
      "premium_report",
    );
    expect(createPremiumReportPdfMock).not.toHaveBeenCalled();
  });

  it("generates a PDF for premium_report approved users without a separate pdf_report payment", async () => {
    checkPaymentAccessMock.mockResolvedValueOnce({
      hasAccess: true,
      paymentId: "premium-payment",
      provider: "paypal",
      productType: "premium_report",
    });
    getOrCreatePremiumReadingMock.mockResolvedValue({ id: "reading-1" });
    createPremiumReportPdfMock.mockResolvedValue({
      buffer: Buffer.from("pdf"),
      filename: "몽이_사주리포트.pdf",
    });

    const { GET } = await import("@/app/api/pdf/[readingId]/route");
    const response = await GET(new Request("http://test.local"), createParams());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      encodeURIComponent("몽이_사주리포트.pdf"),
    );
    expect(checkPaymentAccessMock).toHaveBeenCalledTimes(1);
    expect(checkPaymentAccessMock).toHaveBeenCalledWith(
      "reading-1",
      "premium_report",
    );
    expect(createPremiumReportPdfMock).toHaveBeenCalledWith({ id: "reading-1" });
  });

  it("returns a friendly message when PDF generation fails", async () => {
    checkPaymentAccessMock.mockResolvedValueOnce({
      hasAccess: true,
      paymentId: "premium-payment",
      provider: "paypal",
      productType: "premium_report",
    });
    getOrCreatePremiumReadingMock.mockResolvedValue({ id: "reading-1" });
    createPremiumReportPdfMock.mockRejectedValue(new Error("render failed"));

    const { GET } = await import("@/app/api/pdf/[readingId]/route");
    const response = await GET(new Request("http://test.local"), createParams());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
    });
  });
});
