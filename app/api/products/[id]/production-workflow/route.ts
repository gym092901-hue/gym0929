import { NextResponse } from "next/server";
import { prepareProductionWorkflow } from "@/lib/services/production-workflow-service";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const workspace = await prepareProductionWorkflow(id);
    return NextResponse.json(workspace);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "제작 패키지 준비에 실패했습니다." },
      { status: 500 }
    );
  }
}
