import { getCoupangOpenApiConfig, getCoupangSellerProduct } from "@/lib/coupang/open-api";
import { prisma } from "@/lib/prisma/client";
import { toJsonString } from "@/lib/utils/json";
import { extractProductTruth } from "./product-service";

type EvidenceSeed = {
  kind: string;
  text: string;
  url?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
};

type AssetSeed = {
  kind: string;
  role: string;
  url: string;
  altText?: string;
  metadata?: Record<string, unknown>;
};

const SOURCE_KIND = "coupang-wing-open-api";

export async function ingestCoupangSellerProduct(sellerProductId: string) {
  const cleanId = normalizeSellerProductId(sellerProductId);
  const config = getCoupangOpenApiConfig();
  const payload = await getCoupangSellerProduct(cleanId, config);

  if (!isRecord(payload)) {
    throw new Error("쿠팡 WING Open API 상품 조회 응답이 비어 있습니다.");
  }

  const sourceUrl = `coupang-open-api://seller-products/${cleanId}`;
  const productName = findFirstString(payload, [
    "displayProductName",
    "sellerProductName",
    "productName",
    "vendorItemName",
    "itemName"
  ]);
  const brand = findFirstString(payload, ["brand", "brandName"]);
  const evidenceSeeds = buildCoupangEvidence(payload, cleanId);
  const assetSeeds = buildCoupangAssets(payload);

  const product = await prisma.productProject.create({
    data: {
      sourceUrl,
      productName: productName || `쿠팡 등록상품 ${cleanId}`,
      brand: brand || null,
      status: "ingested"
    }
  });

  const source = await prisma.productSource.create({
    data: {
      productId: product.id,
      url: sourceUrl,
      status: "complete",
      textSnapshot: buildTextSnapshot(payload),
      metadata: toJsonString({
        provider: SOURCE_KIND,
        sellerProductId: cleanId,
        vendorId: config.vendorId,
        capturedAt: new Date().toISOString(),
        payload
      })
    }
  });

  if (assetSeeds.length > 0) {
    await prisma.sourceAsset.createMany({
      data: assetSeeds.map((asset) => ({
        productId: product.id,
        kind: asset.kind,
        role: asset.role,
        url: asset.url,
        altText: asset.altText,
        metadata: toJsonString(asset.metadata ?? {})
      }))
    });
  }

  if (evidenceSeeds.length > 0) {
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
  }

  return extractProductTruth(product.id);
}

export function normalizeSellerProductId(value: string): string {
  const clean = value.trim();
  if (!/^\d+$/.test(clean)) {
    throw new Error("쿠팡 sellerProductId는 숫자만 입력해야 합니다.");
  }
  return clean;
}

function buildCoupangEvidence(payload: Record<string, unknown>, sellerProductId: string): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [];
  const productName = findFirstString(payload, [
    "displayProductName",
    "sellerProductName",
    "productName",
    "vendorItemName",
    "itemName"
  ]);
  const purchaseUrl = buildPurchaseUrl(payload);

  if (productName) {
    evidence.push({
      kind: "page_title",
      text: productName,
      confidence: 0.96,
      metadata: { provider: SOURCE_KIND, field: "productName" }
    });
  }

  pushKnownField(evidence, payload, "brand", "브랜드", "spec");
  pushKnownField(evidence, payload, "brandName", "브랜드", "spec");
  pushKnownField(evidence, payload, "manufacturer", "제조사", "spec");
  pushKnownField(evidence, payload, "statusName", "판매상태", "spec");
  pushKnownField(evidence, payload, "displayCategoryCode", "노출카테고리코드", "spec");
  pushKnownField(evidence, payload, "categoryId", "카테고리ID", "spec");

  for (const price of collectPriceEvidence(payload).slice(0, 12)) {
    evidence.push({
      kind: "price",
      text: price,
      confidence: 0.94,
      metadata: { provider: SOURCE_KIND }
    });
  }

  if (purchaseUrl) {
    evidence.push({
      kind: "purchase_link",
      text: "쿠팡 상품 판매 페이지",
      url: purchaseUrl,
      confidence: 0.82,
      metadata: { provider: SOURCE_KIND, sellerProductId }
    });
  }

  for (const item of collectAttributeEvidence(payload).slice(0, 80)) {
    evidence.push({ ...item, metadata: { provider: SOURCE_KIND, ...item.metadata } });
  }

  for (const item of collectNoticeEvidence(payload).slice(0, 80)) {
    evidence.push({ ...item, metadata: { provider: SOURCE_KIND, ...item.metadata } });
  }

  for (const item of collectContentEvidence(payload).slice(0, 140)) {
    evidence.push({ ...item, metadata: { provider: SOURCE_KIND, ...item.metadata } });
  }

  return dedupeEvidence(evidence).slice(0, 260);
}

function buildCoupangAssets(payload: Record<string, unknown>): AssetSeed[] {
  const assets: AssetSeed[] = [];
  walk(payload, (value, path, parent) => {
    if (typeof value !== "string") return;
    const key = path.at(-1)?.toLowerCase() ?? "";
    if (!["cdnpath", "vendorpath", "imageurl", "url", "content"].includes(key)) return;

    const url = normalizeCoupangAssetUrl(value);
    if (!url) return;
    assets.push({
      kind: "image",
      role: inferImageRole(`${path.join(".")} ${findFirstString(parent, ["imageType", "detailType"]) ?? ""}`),
      url,
      altText: findFirstString(parent, ["imageType", "detailType", "itemName"]) ?? undefined,
      metadata: { provider: SOURCE_KIND, path: path.join(".") }
    });
  });

  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });
}

function collectAttributeEvidence(payload: Record<string, unknown>): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [];
  walk(payload, (_, path, parent) => {
    if (!isRecord(parent)) return;
    const typeName = pickString(parent, "attributeTypeName");
    const valueName = pickString(parent, "attributeValueName");
    if (!typeName || !valueName) return;
    evidence.push({
      kind: "spec",
      text: `${typeName}: ${valueName}`,
      confidence: 0.94,
      metadata: { field: path.slice(0, -1).join(".") }
    });
  });
  return evidence;
}

function collectNoticeEvidence(payload: Record<string, unknown>): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [];
  walk(payload, (_, path, parent) => {
    if (!isRecord(parent)) return;
    const label = pickString(parent, "noticeCategoryDetailName") ?? pickString(parent, "noticeCategoryName");
    const content = pickString(parent, "content");
    if (!label || !content) return;
    evidence.push({
      kind: inferCoupangTextKind(`${label} ${content}`),
      text: `${label}: ${stripHtml(content)}`,
      confidence: 0.9,
      metadata: { field: path.slice(0, -1).join(".") }
    });
  });
  return evidence;
}

function collectContentEvidence(payload: Record<string, unknown>): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [];
  walk(payload, (_, path, parent) => {
    if (!isRecord(parent)) return;
    const detailType = pickString(parent, "detailType") ?? pickString(parent, "contentsType");
    const content = pickString(parent, "content");
    if (!content || normalizeCoupangAssetUrl(content)) return;

    for (const line of splitEvidenceLines(stripHtml(content))) {
      evidence.push({
        kind: inferCoupangTextKind(`${detailType ?? ""} ${line}`),
        text: line,
        confidence: detailType ? 0.86 : 0.76,
        metadata: { field: path.slice(0, -1).join("."), detailType }
      });
    }
  });
  return evidence;
}

function collectPriceEvidence(payload: Record<string, unknown>): string[] {
  const prices: string[] = [];
  const priceKeys = new Set([
    "salePrice",
    "originalPrice",
    "basePrice",
    "price",
    "discountPrice",
    "supplyPrice",
    "maximumBuyForPersonPeriod"
  ]);

  walk(payload, (value, path) => {
    const key = path.at(-1) ?? "";
    if (!priceKeys.has(key)) return;
    if (typeof value !== "number" && typeof value !== "string") return;
    const numeric = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    prices.push(`${labelForPriceKey(key)}: ${numeric.toLocaleString("ko-KR")}원`);
  });

  return Array.from(new Set(prices));
}

function pushKnownField(
  evidence: EvidenceSeed[],
  payload: Record<string, unknown>,
  key: string,
  label: string,
  kind: string
) {
  const value = findFirstPrimitive(payload, key);
  if (value === undefined || value === null || value === "") return;
  evidence.push({
    kind,
    text: `${label}: ${String(value)}`,
    confidence: 0.92,
    metadata: { provider: SOURCE_KIND, field: key }
  });
}

function buildPurchaseUrl(payload: Record<string, unknown>): string | undefined {
  const productId = findFirstPrimitive(payload, "productId");
  const vendorItemId = findFirstPrimitive(payload, "vendorItemId");
  if (!productId) return undefined;

  const params = new URLSearchParams();
  if (vendorItemId) params.set("vendorItemId", String(vendorItemId));
  const query = params.toString();
  return `https://www.coupang.com/vp/products/${productId}${query ? `?${query}` : ""}`;
}

function buildTextSnapshot(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  walk(payload, (value, path) => {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return;
    const text = stripHtml(String(value)).trim();
    if (!text || text.length > 500) return;
    lines.push(`${path.join(".")}: ${text}`);
  });
  return Array.from(new Set(lines)).slice(0, 500).join("\n");
}

function findFirstString(value: unknown, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = findFirstPrimitive(value, key);
    if (typeof found === "string" && found.trim()) return found.trim();
    if (typeof found === "number") return String(found);
  }
  return undefined;
}

function findFirstPrimitive(value: unknown, targetKey: string): string | number | boolean | undefined {
  let result: string | number | boolean | undefined;
  walk(value, (child, path) => {
    if (result !== undefined) return;
    if (path.at(-1) !== targetKey) return;
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      result = child;
    }
  });
  return result;
}

function pickString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function walk(
  value: unknown,
  visitor: (value: unknown, path: string[], parent: Record<string, unknown>) => void,
  path: string[] = [],
  parent: Record<string, unknown> = {},
  seen = new WeakSet<object>()
) {
  visitor(value, path, parent);
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...path, String(index)], parent, seen));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    walk(child, visitor, [...path, key], value as Record<string, unknown>, seen);
  }
}

function normalizeCoupangAssetUrl(value: string): string | undefined {
  const clean = value.trim();
  if (!clean) return undefined;
  if (/^https?:\/\/.+\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(clean)) return clean;
  if (/^\/\/.+\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(clean)) return `https:${clean}`;
  if (/^\/.+\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(clean)) return `https://image.coupangcdn.com${clean}`;
  return undefined;
}

function inferImageRole(value: string): string {
  if (/사용|착용|설치|조리|시연|use|wear|how|DETAIL/i.test(value)) return "usage";
  if (/전후|비교|before|after/i.test(value)) return "before_after";
  if (/상세|detail|스펙|spec/i.test(value)) return "detail";
  if (/주의|경고|caution|warning/i.test(value)) return "caution";
  return "product";
}

function inferCoupangTextKind(line: string): string {
  if (/주의|경고|금지|피하|권장|보관|사용 전|반드시|인증|안전/.test(line)) return "caution";
  if (/사용|방법|설치|단계|넣고|누르|바르|착용|연결|세척|조립/.test(line)) return "usage";
  if (/소재|성분|크기|무게|용량|색상|구성|스펙|제조|원산지|모델명|브랜드/.test(line)) return "spec";
  if (/특징|장점|편리|간편|빠르|깔끔|보호|절약|도움|효율|개선/.test(line)) return "benefit";
  return "text";
}

function splitEvidenceLines(text: string): string[] {
  return text
    .split(/[\n\r]+|(?<=다\.)|(?<=요\.)|(?<=\.)/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 4 && line.length <= 180);
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function labelForPriceKey(key: string): string {
  switch (key) {
    case "salePrice":
      return "판매가";
    case "originalPrice":
      return "정가";
    case "basePrice":
      return "기준가";
    case "discountPrice":
      return "할인가";
    case "supplyPrice":
      return "공급가";
    default:
      return key;
  }
}

function dedupeEvidence(items: EvidenceSeed[]): EvidenceSeed[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.text}:${item.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
