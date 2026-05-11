import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const render = await prisma.videoRender.findUniqueOrThrow({ where: { id } });
    if (!render.filePath) {
      return NextResponse.json({ error: "렌더 파일이 아직 없습니다." }, { status: 404 });
    }
    const file = await fs.readFile(render.filePath);
    return new NextResponse(file, {
      headers: {
        "content-type": "video/mp4",
        "content-disposition": `attachment; filename="${path.basename(render.filePath)}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "다운로드에 실패했습니다." },
      { status: 404 }
    );
  }
}
