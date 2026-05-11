import { NextResponse } from "next/server";
import { PerformanceInputSchema } from "@/lib/schemas/performance";
import { recordPerformanceAndCreateImprovement } from "@/lib/services/sales-service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = PerformanceInputSchema.parse(await request.json());
    return NextResponse.json(await recordPerformanceAndCreateImprovement(id, body));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "성과 입력 처리에 실패했습니다." },
      { status: 400 }
    );
  }
}
