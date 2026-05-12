import type { AssetSeed, EvidenceSeed } from "./evidence";

export type CoupangPartnersWidget = {
  requestedUrl: string;
  finalUrl: string;
  productName: string;
  productImage?: string;
  purchaseLink?: string;
  pageKey?: string;
  itemId?: string;
  trackingCode?: string;
  traceId?: string;
};

const COUPANG_PARTNERS_HOSTS = new Set(["coupa.ng", "partners.coupangcdn.com"]);

export function isCoupangPartnersWidgetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return COUPANG_PARTNERS_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export async function resolveCoupangPartnersWidget(url: string): Promise<CoupangPartnersWidget> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`쿠팡 파트너스 위젯 정보를 가져오지 못했습니다. (${response.status})`);
  }

  const finalUrl = response.url || url;
  const parsed = parseCoupangPartnersUrl(url, finalUrl);
  if (!parsed.productName) {
    throw new Error("쿠팡 파트너스 위젯에서 상품명을 찾지 못했습니다.");
  }

  return parsed as CoupangPartnersWidget;
}

export function parseCoupangPartnersUrl(requestedUrl: string, finalUrl = requestedUrl): Partial<CoupangPartnersWidget> {
  const final = new URL(finalUrl);
  const query = final.searchParams;
  const linkUrl = query.get("linkUrl") ?? undefined;
  const linkParams = parseUrlSearchParams(linkUrl);

  return {
    requestedUrl,
    finalUrl,
    productName: query.get("productDescription") ?? "",
    productImage: query.get("productImage") ?? undefined,
    purchaseLink: linkUrl,
    pageKey: query.get("pageKey") ?? linkParams.get("pageKey") ?? undefined,
    itemId: query.get("itemId") ?? linkParams.get("itemId") ?? undefined,
    trackingCode: query.get("trackingCode") ?? linkParams.get("lptag") ?? undefined,
    traceId: query.get("traceId") ?? linkParams.get("traceid") ?? undefined
  };
}

export function buildCoupangPartnersEvidence(widget: CoupangPartnersWidget): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [
    {
      kind: "page_title",
      text: widget.productName,
      confidence: 0.9,
      metadata: { provider: "coupang-partners-widget", field: "productDescription" }
    }
  ];

  if (widget.purchaseLink) {
    evidence.push({
      kind: "purchase_link",
      text: "쿠팡 파트너스 구매 링크",
      url: widget.purchaseLink,
      confidence: 0.82,
      metadata: {
        provider: "coupang-partners-widget",
        pageKey: widget.pageKey,
        itemId: widget.itemId,
        trackingCode: widget.trackingCode
      }
    });
  }

  if (widget.pageKey) {
    evidence.push({
      kind: "spec",
      text: `쿠팡 pageKey: ${widget.pageKey}`,
      confidence: 0.8,
      metadata: { provider: "coupang-partners-widget", field: "pageKey" }
    });
  }

  if (widget.itemId) {
    evidence.push({
      kind: "spec",
      text: `쿠팡 itemId: ${widget.itemId}`,
      confidence: 0.8,
      metadata: { provider: "coupang-partners-widget", field: "itemId" }
    });
  }

  return evidence;
}

export function buildCoupangPartnersAssets(widget: CoupangPartnersWidget): AssetSeed[] {
  if (!widget.productImage) return [];
  return [
    {
      kind: "image",
      role: "product",
      url: widget.productImage,
      altText: widget.productName,
      metadata: { provider: "coupang-partners-widget", field: "productImage" }
    }
  ];
}

export function buildCoupangPartnersTextSnapshot(widget: CoupangPartnersWidget): string {
  return [
    `상품명: ${widget.productName}`,
    widget.productImage ? `상품 이미지: ${widget.productImage}` : "",
    widget.purchaseLink ? `구매 링크: ${widget.purchaseLink}` : "",
    widget.pageKey ? `쿠팡 pageKey: ${widget.pageKey}` : "",
    widget.itemId ? `쿠팡 itemId: ${widget.itemId}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function parseUrlSearchParams(value: string | undefined): URLSearchParams {
  if (!value) return new URLSearchParams();
  try {
    return new URL(value).searchParams;
  } catch {
    return new URLSearchParams();
  }
}
