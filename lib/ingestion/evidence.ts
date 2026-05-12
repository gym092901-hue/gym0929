import type { ScrapedPage } from "./scrape-product-page";

export type AssetSeed = {
  kind: string;
  role: string;
  url?: string;
  localPath?: string;
  altText?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
};

export type EvidenceSeed = {
  kind: string;
  text: string;
  url?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
};

export function buildAssetSeeds(page: ScrapedPage): AssetSeed[] {
  return page.images.slice(0, 40).map((image) => ({
    kind: "image",
    role: inferImageRole(image.altText ?? image.url),
    url: image.url,
    altText: image.altText,
    width: image.width,
    height: image.height
  }));
}

export function buildEvidenceSeeds(page: ScrapedPage): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [];
  if (page.title) {
    evidence.push({ kind: "page_title", text: page.title, confidence: 0.9 });
  }

  const lines = page.text
    .split(/[\n\r]+|(?<=다\.)|(?<=요\.)|(?<=\.)/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 4 && line.length <= 180);

  for (const price of extractPriceCandidates(page.text).slice(0, 8)) {
    evidence.push({ kind: "price", text: price, confidence: 0.82 });
  }

  for (const link of page.links.filter(isPurchaseLikeLink).slice(0, 12)) {
    evidence.push({
      kind: "purchase_link",
      text: link.label || link.url,
      url: link.url,
      confidence: 0.78
    });
  }

  for (const line of lines.slice(0, 220)) {
    const kind = inferTextKind(line);
    evidence.push({
      kind,
      text: line,
      confidence: kind === "caution" || kind === "usage" ? 0.78 : 0.68
    });
  }

  return dedupeEvidence(evidence).slice(0, 260);
}

export function extractPriceAmount(rawText: string): number | null {
  const match = rawText.match(/(?:₩|원|KRW)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})\s*(?:원|KRW)?/i);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function inferImageRole(value: string): string {
  if (/사용|착용|설치|조리|시연|use|wear|how/i.test(value)) return "usage";
  if (/전후|비교|before|after/i.test(value)) return "before_after";
  if (/상세|detail|스펙|spec/i.test(value)) return "detail";
  if (/주의|경고|caution|warning/i.test(value)) return "caution";
  return "product";
}

function extractPriceCandidates(text: string): string[] {
  const matches = text.match(/(?:₩\s*)?[0-9]{1,3}(?:,[0-9]{3})+\s*원?|[0-9]{4,}\s*원/g);
  return matches ?? [];
}

function isPurchaseLikeLink(link: { label: string; url: string }): boolean {
  return /구매|주문|장바구니|결제|옵션|buy|cart|order|checkout|smartstore|coupon/i.test(
    `${link.label} ${link.url}`
  );
}

function inferTextKind(line: string): string {
  if (/주의|경고|금지|피하|권장|보관|사용 전|반드시/.test(line)) return "caution";
  if (/사용|방법|설치|단계|넣고|누르|바르|착용|연결/.test(line)) return "usage";
  if (/소재|성분|크기|무게|용량|색상|구성|스펙|제조|원산지/.test(line)) return "spec";
  if (/특징|장점|편리|간편|빠르|깔끔|보호|절약|도움/.test(line)) return "benefit";
  return "text";
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
