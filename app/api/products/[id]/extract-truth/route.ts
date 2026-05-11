import { NextResponse } from "next/server";
import { extractProductTruth } from "@/lib/services/product-service";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await extractProductTruth(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ProductTruth 생성에 실패했습니다." },
      { status: 400 }
    );
  }
}
