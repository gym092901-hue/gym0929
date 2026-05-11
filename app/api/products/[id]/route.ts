import { NextResponse } from "next/server";
import { getProductWorkspace } from "@/lib/services/product-service";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await getProductWorkspace(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "상품을 찾을 수 없습니다." },
      { status: 404 }
    );
  }
}
