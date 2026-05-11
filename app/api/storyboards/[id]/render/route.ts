import { NextResponse } from "next/server";
import { renderStoryboardToMp4 } from "@/lib/remotion/render";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const render = await renderStoryboardToMp4(id);
    return NextResponse.json(render);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "스토리보드 렌더링에 실패했습니다." },
      { status: 500 }
    );
  }
}
