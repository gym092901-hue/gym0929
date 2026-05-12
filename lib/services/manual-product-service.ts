import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import {
  buildManualAssetSeeds,
  buildManualEvidenceSeeds,
  inferManualImageRole,
  type ManualProductMaterials
} from "@/lib/ingestion/manual-materials";
import { prisma } from "@/lib/prisma/client";
import { toJsonString } from "@/lib/utils/json";
import { extractProductTruth } from "./product-service";

export type UploadedManualImage = {
  originalName: string;
  contentType: string;
  bytes: Buffer;
};

export type ManualProductInput = ManualProductMaterials & {
  images?: UploadedManualImage[];
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function ingestManualProduct(input: ManualProductInput) {
  const productName = input.productName.trim();
  if (productName.length < 2) {
    throw new Error("상품명을 입력하세요.");
  }
  if (!hasEnoughManualMaterial(input)) {
    throw new Error("상품 설명, 장점, 사용법, 주의사항, 이미지 중 하나 이상을 입력하세요.");
  }

  const product = await prisma.productProject.create({
    data: {
      sourceUrl: "manual://product-materials",
      productName,
      brand: input.brand?.trim() || null,
      status: "ingested"
    }
  });

  const source = await prisma.productSource.create({
    data: {
      productId: product.id,
      url: "manual://product-materials",
      status: "complete",
      textSnapshot: buildManualTextSnapshot(input),
      metadata: toJsonString({
        provider: "manual-materials",
        imageCount: input.images?.length ?? 0,
        capturedAt: new Date().toISOString()
      })
    }
  });

  const uploadedAssets = await saveUploadedManualImages(product.id, input.images ?? []);
  const linkedAssets = buildManualAssetSeeds({ ...input, productName });
  const assets = [...linkedAssets, ...uploadedAssets];

  if (assets.length > 0) {
    await prisma.sourceAsset.createMany({
      data: assets.map((asset) => ({
        productId: product.id,
        kind: asset.kind,
        role: asset.role,
        url: asset.url,
        localPath: asset.localPath,
        altText: asset.altText,
        metadata: toJsonString(asset.metadata ?? {})
      }))
    });
  }

  const evidenceSeeds = buildManualEvidenceSeeds({ ...input, productName });
  await prisma.evidenceItem.createMany({
    data: evidenceSeeds.map((item) => ({
      productId: product.id,
      sourceId: source.id,
      kind: item.kind,
      text: item.text,
      url: item.url,
      confidence: item.confidence,
      metadata: toJsonString(item.metadata ?? {})
    }))
  });

  return extractProductTruth(product.id);
}

function hasEnoughManualMaterial(input: ManualProductInput): boolean {
  return Boolean(
    input.description?.trim() ||
      input.benefits?.trim() ||
      input.usage?.trim() ||
      input.cautions?.trim() ||
      input.imageNotes?.trim() ||
      input.imageUrls?.length ||
      input.images?.length ||
      input.priceText?.trim() ||
      input.purchaseLink?.trim()
  );
}

async function saveUploadedManualImages(productId: string, images: UploadedManualImage[]) {
  const assets: Array<{
    kind: string;
    role: string;
    url: string;
    localPath: string;
    altText?: string;
    metadata?: Record<string, unknown>;
  }> = [];
  const uploadDir = join(process.cwd(), "public", "uploads", "manual", productId);
  await mkdir(uploadDir, { recursive: true });

  for (const image of images.slice(0, 12)) {
    if (image.bytes.byteLength === 0) continue;
    if (image.bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(`${image.originalName} 파일은 8MB 이하 이미지만 업로드할 수 있습니다.`);
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.contentType)) {
      throw new Error(`${image.originalName} 파일 형식은 jpg, png, webp, gif만 지원합니다.`);
    }

    const extension = extensionForImage(image.contentType, image.originalName);
    const fileName = `${randomUUID()}${extension}`;
    const localPath = join(uploadDir, fileName);
    await writeFile(localPath, image.bytes);
    const publicUrl = `/uploads/manual/${productId}/${fileName}`;

    assets.push({
      kind: "image",
      role: inferManualImageRole(image.originalName),
      url: publicUrl,
      localPath,
      altText: image.originalName,
      metadata: {
        provider: "manual-materials",
        source: "uploadedFile",
        originalName: image.originalName,
        contentType: image.contentType,
        size: image.bytes.byteLength
      }
    });
  }

  return assets;
}

function extensionForImage(contentType: string, originalName: string): string {
  const current = extname(originalName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(current)) return current;
  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".img";
  }
}

function buildManualTextSnapshot(input: ManualProductInput): string {
  return [
    `상품명: ${input.productName}`,
    input.brand ? `브랜드: ${input.brand}` : "",
    input.priceText ? `가격: ${input.priceText}` : "",
    input.purchaseLink ? `구매 링크: ${input.purchaseLink}` : "",
    input.description ? `설명:\n${input.description}` : "",
    input.benefits ? `장점/특징:\n${input.benefits}` : "",
    input.usage ? `사용법/사용 장면:\n${input.usage}` : "",
    input.cautions ? `주의사항:\n${input.cautions}` : "",
    input.imageNotes ? `이미지 근거 설명:\n${input.imageNotes}` : "",
    input.imageUrls?.length ? `이미지 URL:\n${input.imageUrls.join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}
