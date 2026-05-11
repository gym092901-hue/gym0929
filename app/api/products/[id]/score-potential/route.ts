import { NextResponse } from "next/server";
import { scoreProductPotential } from "@/lib/services/sales-service";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await scoreProductPotential(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "판매 가능성 점수화에 실패했습니다." },
      { status: 400 }
    );
  }
}
