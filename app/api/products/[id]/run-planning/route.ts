import { NextResponse } from "next/server";
import { extractProductTruth, getProductWorkspace } from "@/lib/services/product-service";
import {
  createConversionPackage,
  generateHooksForProduct,
  generateSalesAngles,
  generateStoryboards,
  scoreProductPotential
} from "@/lib/services/sales-service";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await extractProductTruth(id);
    await scoreProductPotential(id);
    await generateSalesAngles(id);
    await generateHooksForProduct(id);
    await generateStoryboards(id);
    await createConversionPackage(id);
    return NextResponse.json(await getProductWorkspace(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "전체 판매 설계 실행에 실패했습니다." },
      { status: 400 }
    );
  }
}
