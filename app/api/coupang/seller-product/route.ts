import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestCoupangSellerProduct } from "@/lib/services/coupang-service";

export const runtime = "nodejs";

const BodySchema = z.object({
  sellerProductId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const product = await ingestCoupangSellerProduct(body.sellerProductId);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "쿠팡 WING API 상품 조회에 실패했습니다." },
      { status: 400 }
    );
  }
}
