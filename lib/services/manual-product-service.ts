import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import {
  buildCoupangPartnersAssets,
  buildCoupangPartnersEvidence,
  buildCoupangPartnersTextSnapshot,
  isCoupangPartnersWidgetUrl,
  resolveCoupangPartnersWidget,
  type CoupangPartnersWidget
} from "@/lib/ingestion/coupang-partners-widget";
import {
  buildManualAssetSeeds,
  buildManualEvidenceSeeds,
  inferManualAssetKind,
  inferManualImageRole,
  type ManualProductMaterials
} from "@/lib/ingestion/manual-materials";
import { prisma } from "@/lib/prisma/client";
import { toJsonString } from "@/lib/utils/json";
import { normalizeProductUrl } from "@/lib/utils/url";
import { extractProductTruth } from "./product-service";

export type UploadedManualImage = {
  originalName: string;
  contentType: string;
  bytes: Buffer;
};

export type ManualProductInput = ManualProductMaterials & {
  images?: UploadedManualImage[];
};

type ResolvedManualSource = {
  sourceUrl?: string;
  widget?: CoupangPartnersWidget;
  evidence: ReturnType<typeof buildCoupangPartnersEvidence>;
  assets: ReturnType<typeof buildCoupangPartnersAssets>;
  textSnapshot: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);

export async function ingestManualProduct(input: ManualProductInput) {
  const resolvedSource = await resolveManualSource(input.sourceSnippet);
  const mergedInput = mergeManualInputWithSource(input, resolvedSource);
  const productName = mergedInput.productName.trim();
  if (productName.length < 2) {
    throw new Error("상품명을 입력하거나 쿠팡 파트너스 iframe을 함께 붙여넣으세요.");
  }
  if (!hasEnoughManualMaterial(mergedInput, resolvedSource)) {
    throw new Error("상품 설명, 장점, 사용법, 주의사항, 이미지 중 하나 이상을 입력하세요.");
  }

  const product = await prisma.productProject.create({
    data: {
      sourceUrl: resolvedSource?.sourceUrl ?? "manual://product-materials",
      productName,
      brand: mergedInput.brand?.trim() || null,
      status: "ingested"
    }
  });

  const source = await prisma.productSource.create({
    data: {
      productId: product.id,
      url: resolvedSource?.sourceUrl ?? "manual://product-materials",
      status: "complete",
      textSnapshot: [resolvedSource?.textSnapshot, buildManualTextSnapshot(mergedInput)].filter(Boolean).join("\n\n"),
      metadata: toJsonString({
        provider: "manual-materials",
        sourceProvider: resolvedSource?.widget ? "coupang-partners-widget" : undefined,
        sourceUrl: resolvedSource?.sourceUrl,
        imageCount: mergedInput.images?.length ?? 0,
        capturedAt: new Date().toISOString()
      })
    }
  });

  const uploadedAssets = await saveUploadedManualImages(product.id, mergedInput.images ?? []);
  const linkedAssets = buildManualAssetSeeds({ ...mergedInput, productName });
  const assets = dedupeAssets([...(resolvedSource?.assets ?? []), ...linkedAssets, ...uploadedAssets]);

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

  const evidenceSeeds = dedupeEvidence([
    ...(resolvedSource?.evidence ?? []),
    ...buildManualEvidenceSeeds({ ...mergedInput, productName })
  ]);
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

export async function resolveManualSource(sourceSnippet: string | undefined): Promise<ResolvedManualSource | null> {
  if (!sourceSnippet?.trim()) return null;

  let sourceUrl: string;
  try {
    sourceUrl = normalizeProductUrl(sourceSnippet);
  } catch {
    throw new Error("상품 링크/iframe 주소를 확인하세요.");
  }

  if (!isCoupangPartnersWidgetUrl(sourceUrl)) {
    return {
      sourceUrl,
      evidence: [
        {
          kind: "purchase_link",
          text: "상품 링크",
          url: sourceUrl,
          confidence: 0.72,
          metadata: { provider: "manual-source-link" }
        }
      ],
      assets: [],
      textSnapshot: `상품 링크: ${sourceUrl}`
    };
  }

  const widget = await resolveCoupangPartnersWidget(sourceUrl);
  return {
    sourceUrl: widget.finalUrl,
    widget,
    evidence: buildCoupangPartnersEvidence(widget),
    assets: buildCoupangPartnersAssets(widget),
    textSnapshot: buildCoupangPartnersTextSnapshot(widget)
  };
}

export function mergeManualInputWithSource(
  input: ManualProductInput,
  resolvedSource: Pick<ResolvedManualSource, "sourceUrl" | "widget"> | null
): ManualProductInput {
  const widget = resolvedSource?.widget;
  return {
    ...input,
    productName: input.productName.trim() || widget?.productName || "",
    purchaseLink: input.purchaseLink?.trim() || widget?.purchaseLink || resolvedSource?.sourceUrl || "",
    imageUrls: [widget?.productImage, ...(input.imageUrls ?? [])].filter((url): url is string => Boolean(url))
  };
}

function hasEnoughManualMaterial(input: ManualProductInput, resolvedSource: ResolvedManualSource | null): boolean {
  return Boolean(
    input.description?.trim() ||
      input.benefits?.trim() ||
      input.usage?.trim() ||
      input.cautions?.trim() ||
      input.imageNotes?.trim() ||
      input.imageUrls?.length ||
      input.images?.length ||
      input.priceText?.trim() ||
      input.purchaseLink?.trim() ||
      resolvedSource?.evidence.length ||
      resolvedSource?.assets.length
  );
}

export async function saveUploadedManualImages(productId: string, images: UploadedManualImage[]) {
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
    const isVideo = image.contentType.startsWith("video/");
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (image.bytes.byteLength > maxBytes) {
      throw new Error(`${image.originalName} 파일은 ${isVideo ? "80MB 이하 영상" : "8MB 이하 이미지"}만 업로드할 수 있습니다.`);
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.contentType) && !ALLOWED_VIDEO_TYPES.has(image.contentType)) {
      throw new Error(`${image.originalName} 파일 형식은 jpg, png, webp, gif, mp4, webm, mov만 지원합니다.`);
    }

    const extension = extensionForMedia(image.contentType, image.originalName);
    const fileName = `${randomUUID()}${extension}`;
    const localPath = join(uploadDir, fileName);
    await writeFile(localPath, image.bytes);
    const publicUrl = `/uploads/manual/${productId}/${fileName}`;

    assets.push({
      kind: inferManualAssetKind(fileName),
      role: isVideo ? inferManualVideoRole(image.originalName) : inferManualImageRole(image.originalName),
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

function extensionForMedia(contentType: string, originalName: string): string {
  const current = extname(originalName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".m4v"].includes(current)) return current;
  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/quicktime":
      return ".mov";
    case "video/x-m4v":
      return ".m4v";
    default:
      return ".bin";
  }
}

function inferManualVideoRole(value: string): string {
  if (/전후|비교|before|after/i.test(value)) return "before_after";
  if (/주의|경고|caution|warning/i.test(value)) return "caution";
  return "usage";
}

function buildManualTextSnapshot(input: ManualProductInput): string {
  return [
    input.sourceSnippet ? `상품 링크/iframe:\n${input.sourceSnippet}` : "",
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

function dedupeAssets<T extends { url?: string; localPath?: string }>(assets: T[]): T[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = asset.url || asset.localPath;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeEvidence<T extends { kind: string; text: string; url?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.text}:${item.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
