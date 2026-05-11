import { NextResponse } from "next/server";
import { getProductWorkspace } from "@/lib/services/product-service";
import { createConversionPackage } from "@/lib/services/sales-service";
import { renderTopStoryboards } from "@/lib/remotion/render";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await renderTopStoryboards(id, 3);
    await createConversionPackage(id);
    return NextResponse.json(await getProductWorkspace(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "영상 렌더링에 실패했습니다." },
      { status: 500 }
    );
  }
}
