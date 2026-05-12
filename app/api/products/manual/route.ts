import { NextResponse } from "next/server";
import { ingestManualProduct, type UploadedManualImage } from "@/lib/services/manual-product-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const images = await collectImages(formData);
    const product = await ingestManualProduct({
      productName: getString(formData, "productName"),
      brand: getString(formData, "brand"),
      priceText: getString(formData, "priceText"),
      purchaseLink: getString(formData, "purchaseLink"),
      description: getString(formData, "description"),
      benefits: getString(formData, "benefits"),
      usage: getString(formData, "usage"),
      cautions: getString(formData, "cautions"),
      imageNotes: getString(formData, "imageNotes"),
      imageUrls: splitLines(getString(formData, "imageUrls")),
      images
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "상품 자료 입력에 실패했습니다." },
      { status: 400 }
    );
  }
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function collectImages(formData: FormData): Promise<UploadedManualImage[]> {
  const values = formData.getAll("images");
  const images: UploadedManualImage[] = [];

  for (const value of values) {
    if (!(value instanceof File) || value.size === 0) continue;
    images.push({
      originalName: value.name,
      contentType: value.type,
      bytes: Buffer.from(await value.arrayBuffer())
    });
  }

  return images;
}
