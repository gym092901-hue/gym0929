import { NextResponse } from "next/server";
import { generateAiUsageMediaForProduct } from "@/lib/services/ai-media-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const workspace = await generateAiUsageMediaForProduct(id);
    return NextResponse.json(workspace);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 사용 영상 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
