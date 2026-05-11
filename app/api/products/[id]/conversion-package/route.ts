import { NextResponse } from "next/server";
import { createConversionPackage } from "@/lib/services/sales-service";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await createConversionPackage(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 패키지 생성에 실패했습니다." },
      { status: 400 }
    );
  }
}
