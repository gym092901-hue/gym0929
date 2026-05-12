import { NextResponse } from "next/server";
import { generateLocalSceneMedia } from "@/lib/services/local-media-service";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspace = await generateLocalSceneMedia(id);
    return NextResponse.json(workspace);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "로컬 이미지/모션 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
