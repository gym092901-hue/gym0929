import { NextResponse } from "next/server";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { createPremiumReportPdf } from "@/lib/pdf/createPremiumReportPdf";
import { getOrCreatePremiumReading } from "@/lib/readings";

export const runtime = "nodejs";

type PdfRouteProps = {
  params: Promise<{
    readingId: string;
  }>;
};

function encodeFilename(filename: string) {
  return encodeURIComponent(filename).replace(/['()]/g, escape);
}

export async function GET(_request: Request, { params }: PdfRouteProps) {
  const { readingId } = await params;
  const premiumAccess = await checkPaymentAccess(readingId, "premium_report");

  if (!premiumAccess.hasAccess) {
    return NextResponse.json(
      { error: "심층 리포트 결제 후 PDF를 구매할 수 있습니다." },
      { status: 403 },
    );
  }

  const pdfAccess = await checkPaymentAccess(readingId, "pdf_report");

  if (!pdfAccess.hasAccess) {
    return NextResponse.json(
      { error: "PDF 소장본 결제 후 다운로드할 수 있습니다." },
      { status: 403 },
    );
  }

  try {
    const reading = await getOrCreatePremiumReading(readingId);

    if (!reading) {
      return NextResponse.json(
        { error: "리포트 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { buffer, filename } = await createPremiumReportPdf(reading);
    const encodedFilename = encodeFilename(filename);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed", {
      readingId,
      error,
    });

    return NextResponse.json(
      { error: "PDF 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
