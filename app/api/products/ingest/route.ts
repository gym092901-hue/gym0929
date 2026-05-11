import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestProduct } from "@/lib/services/product-service";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const product = await ingestProduct(body.url);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "상품 수집에 실패했습니다." },
      { status: 400 }
    );
  }
}
