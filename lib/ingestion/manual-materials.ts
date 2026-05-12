import type { AssetSeed, EvidenceSeed } from "./evidence";

export type ManualProductMaterials = {
  sourceSnippet?: string;
  productName: string;
  brand?: string;
  priceText?: string;
  purchaseLink?: string;
  description?: string;
  benefits?: string;
  usage?: string;
  cautions?: string;
  imageNotes?: string;
  imageUrls?: string[];
};

export function buildManualEvidenceSeeds(input: ManualProductMaterials): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [
    {
      kind: "page_title",
      text: input.productName.trim(),
      confidence: 0.98,
      metadata: { provider: "manual-materials", field: "productName" }
    }
  ];

  if (input.brand?.trim()) {
    evidence.push({
      kind: "spec",
      text: `브랜드: ${input.brand.trim()}`,
      confidence: 0.92,
      metadata: { provider: "manual-materials", field: "brand" }
    });
  }

  if (input.priceText?.trim()) {
    evidence.push({
      kind: "price",
      text: input.priceText.trim(),
      confidence: 0.9,
      metadata: { provider: "manual-materials", field: "priceText" }
    });
  }

  const purchaseLink = normalizeManualUrl(input.purchaseLink);
  if (purchaseLink) {
    evidence.push({
      kind: "purchase_link",
      text: "구매 링크",
      url: purchaseLink,
      confidence: 0.86,
      metadata: { provider: "manual-materials", field: "purchaseLink" }
    });
  }

  evidence.push(...linesToEvidence(input.description, "description"));
  evidence.push(...linesToEvidence(input.benefits, "benefits", "benefit", 0.86));
  evidence.push(...linesToEvidence(input.usage, "usage", "usage", 0.9));
  evidence.push(...linesToEvidence(input.cautions, "cautions", "caution", 0.9));
  evidence.push(...linesToEvidence(input.imageNotes, "imageNotes", undefined, 0.84));

  return dedupeEvidence(evidence).slice(0, 260);
}

export function buildManualAssetSeeds(input: ManualProductMaterials): AssetSeed[] {
  return normalizeManualImageUrls(input.imageUrls ?? []).map((url) => ({
    kind: "image",
    role: inferManualImageRole(url),
    url,
    altText: input.productName,
    metadata: { provider: "manual-materials", source: "imageUrl" }
  }));
}

export function normalizeManualImageUrls(values: string[] | string): string[] {
  const rawValues = Array.isArray(values) ? values : values.split(/\r?\n|,/);
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const value of rawValues) {
    const normalized = normalizeManualUrl(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

export function inferManualImageRole(value: string): string {
  if (/사용|착용|설치|조리|시연|use|wear|how|usage/i.test(value)) return "usage";
  if (/전후|비교|before|after/i.test(value)) return "before_after";
  if (/상세|detail|스펙|spec/i.test(value)) return "detail";
  if (/주의|경고|caution|warning/i.test(value)) return "caution";
  return "product";
}

function linesToEvidence(
  value: string | undefined,
  field: string,
  forcedKind?: string,
  confidence = 0.76
): EvidenceSeed[] {
  return splitManualLines(value).map((line) => ({
    kind: forcedKind ?? inferManualTextKind(line),
    text: line,
    confidence,
    metadata: { provider: "manual-materials", field }
  }));
}

function splitManualLines(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[\n\r]+|(?<=다\.)|(?<=요\.)|(?<=\.)/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 2 && line.length <= 220);
}

function inferManualTextKind(line: string): string {
  if (/주의|경고|금지|피하|권장|보관|사용 전|반드시/.test(line)) return "caution";
  if (/사용|방법|설치|단계|넣고|누르|바르|착용|연결|촬영|장면/.test(line)) return "usage";
  if (/소재|성분|크기|무게|용량|색상|구성|스펙|제조|원산지/.test(line)) return "spec";
  if (/특징|장점|편리|간편|빠르|깔끔|보호|절약|도움|해결/.test(line)) return "benefit";
  return "text";
}

function normalizeManualUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
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
