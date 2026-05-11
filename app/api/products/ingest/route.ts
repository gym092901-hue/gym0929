import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestProduct } from "@/lib/services/product-service";
import { normalizeProductUrl } from "@/lib/utils/url";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const product = await ingestProduct(normalizeProductUrl(body.url));
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "상품 수집에 실패했습니다." },
      { status: 400 }
    );
  }
}
