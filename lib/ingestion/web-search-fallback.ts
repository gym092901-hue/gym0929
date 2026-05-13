import type { AssetSeed, EvidenceSeed } from "./evidence";
import type { ScrapedPage } from "./scrape-product-page";

export type WebSearchFallbackResult = {
  sourceUrl: string;
  query: string;
  productName: string;
  textSnapshot: string;
  evidence: EvidenceSeed[];
  assets: AssetSeed[];
  metadata: Record<string, unknown>;
};

type SearchResult = {
  title: string;
  snippet: string;
  url?: string;
};

const SEARCH_TIMEOUT_MS = 10_000;

export async function buildWebSearchFallback(
  sourceUrl: string,
  reason?: string,
  fetcher: typeof fetch = fetch
): Promise<WebSearchFallbackResult> {
  const query = buildProductSearchQuery(sourceUrl);
  const productName = inferProductNameFromQuery(sourceUrl, query);
  const searchResults = await searchSameProduct(query, fetcher).catch(() => []);
  const evidence = buildSearchEvidence({ sourceUrl, query, productName, reason, searchResults });

  return {
    sourceUrl,
    query,
    productName,
    textSnapshot: buildTextSnapshot({ sourceUrl, query, productName, reason, searchResults }),
    evidence,
    assets: [],
    metadata: {
      provider: "web-search-fallback",
      query,
      sourceUrl,
      reason,
      resultCount: searchResults.length
    }
  };
}

export function shouldUseWebSearchFallback(page: Pick<ScrapedPage, "title" | "text" | "images">): boolean {
  const haystack = `${page.title}\n${page.text}`.toLowerCase();
  const hasErrorPage =
    /에러페이지|시스템오류|현재 서비스 접속이 불가|동시에 접속하는 이용자 수가 많거나|access denied|captcha|403 forbidden|429/i.test(
      haystack
    );
  const hasMeaningfulProductText = page.text.length >= 500 && !hasErrorPage;
  return hasErrorPage || (!hasMeaningfulProductText && page.images.length === 0);
}

export function buildProductSearchQuery(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  const params = url.searchParams;
  const explicitQuery = normalizeSearchTerm(firstNonEmpty([
    params.get("n_query"),
    params.get("query"),
    params.get("q"),
    params.get("keyword"),
    params.get("searchKeyword")
  ]));
  const storeSlug = inferStoreSlug(url);
  const productId = inferProductId(url);
  const parts = [storeSlug, explicitQuery, productId ? `상품 ${productId}` : ""]
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 0) return Array.from(new Set(parts)).join(" ");
  return decodeURIComponent(url.pathname)
    .split(/[/?#/_-]+/)
    .filter((part) => part.length >= 2 && !/^\d+$/.test(part))
    .slice(0, 4)
    .join(" ");
}

export function inferProductNameFromQuery(sourceUrl: string, query: string): string {
  const url = new URL(sourceUrl);
  const storeSlug = inferStoreSlug(url);
  const directQuery = normalizeSearchTerm(firstNonEmpty([url.searchParams.get("n_query"), url.searchParams.get("query"), url.searchParams.get("q")]));
  if (storeSlug && directQuery) return `${formatStoreSlug(storeSlug)} ${directQuery}`.trim();
  return query.replace(/\b상품\s+\d+\b/g, "").replace(/\s+/g, " ").trim() || "웹검색 보강 상품";
}

async function searchSameProduct(query: string, fetcher: typeof fetch): Promise<SearchResult[]> {
  const urls = [
    `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`,
    `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  ];
  const results: SearchResult[] = [];

  for (const url of urls) {
    const html = await fetchText(url, fetcher).catch(() => "");
    if (!html) continue;
    results.push(...parseSearchResults(html));
    if (results.length >= 8) break;
  }

  return dedupeResults(results).slice(0, 8);
}

async function fetchText(url: string, fetcher: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7"
      }
    });
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = decodeHtml(
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? ""
  );
  if (title) results.push({ title: clean(title), snippet: clean(description) });

  const anchorMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of anchorMatches) {
    const url = decodeHtml(match[1]);
    const titleText = clean(decodeHtml(stripTags(match[2])));
    if (!titleText || titleText.length < 4 || titleText.length > 120) continue;
    if (/로그인|더보기|이미지|동영상|뉴스|지도|메일|카페|블로그/.test(titleText)) continue;
    results.push({ title: titleText, snippet: "", url });
    if (results.length >= 16) break;
  }

  return results;
}

function buildSearchEvidence(input: {
  sourceUrl: string;
  query: string;
  productName: string;
  reason?: string;
  searchResults: SearchResult[];
}): EvidenceSeed[] {
  const evidence: EvidenceSeed[] = [
    {
      kind: "page_title",
      text: input.productName,
      confidence: 0.68,
      metadata: { provider: "web-search-fallback", query: input.query }
    },
    {
      kind: "purchase_link",
      text: "원본 상품 링크",
      url: input.sourceUrl,
      confidence: 0.72,
      metadata: { provider: "web-search-fallback" }
    },
    {
      kind: "text",
      text: `원본 상세페이지 자동 수집이 막혀 웹검색으로 같은 상품 후보를 보강했습니다. 검색어: ${input.query}`,
      confidence: 0.58,
      metadata: { provider: "web-search-fallback", reason: input.reason }
    }
  ];

  for (const result of input.searchResults) {
    const text = clean(`${result.title}. ${result.snippet}`);
    if (text.length < 4) continue;
    evidence.push({
      kind: inferSearchEvidenceKind(text),
      text,
      url: result.url,
      confidence: 0.55,
      metadata: { provider: "web-search-fallback", query: input.query }
    });
  }

  evidence.push(
    {
      kind: "usage",
      text: "상세 본문을 직접 확인하지 못한 경우 실제 사용 장면은 직접 촬영 자료나 로컬 모션 장면으로 보강합니다.",
      confidence: 0.54,
      metadata: { provider: "web-search-fallback" }
    },
    {
      kind: "caution",
      text: "웹검색 보강 자료만으로 치료, 통증 완화, 교정, 성능 수치 주장은 만들지 않습니다.",
      confidence: 0.8,
      metadata: { provider: "web-search-fallback" }
    }
  );

  return dedupeEvidence(evidence).slice(0, 40);
}

function buildTextSnapshot(input: {
  sourceUrl: string;
  query: string;
  productName: string;
  reason?: string;
  searchResults: SearchResult[];
}) {
  return [
    `원본 상품 링크: ${input.sourceUrl}`,
    `웹검색 보강 검색어: ${input.query}`,
    `보강 상품명: ${input.productName}`,
    input.reason ? `보강 사유: ${input.reason}` : "",
    ...input.searchResults.map((result, index) => `${index + 1}. ${clean(`${result.title} ${result.snippet}`)}`)
  ]
    .filter(Boolean)
    .join("\n");
}

function inferSearchEvidenceKind(text: string) {
  if (/가격|원|무료배송|할인/.test(text)) return "price";
  if (/사용|운동|스트레칭|홈트|필라테스|마사지|루틴/.test(text)) return "usage";
  if (/소재|EVA|색상|크기|구성|길이|지름|원산지/i.test(text)) return "spec";
  if (/주의|금지|반품|교환|배송/.test(text)) return "caution";
  return "text";
}

function inferStoreSlug(url: URL) {
  if (url.hostname.includes("smartstore.naver.com")) {
    return url.pathname.split("/").filter(Boolean)[0] ?? "";
  }
  return "";
}

function inferProductId(url: URL) {
  const pathId = url.pathname.match(/products\/(\d+)/)?.[1];
  return pathId || url.searchParams.get("n_mall_pid") || url.searchParams.get("productId") || "";
}

function formatStoreSlug(slug: string) {
  if (/^[a-z0-9_-]+$/i.test(slug)) return slug.toUpperCase();
  return slug;
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim() ?? "").find(Boolean) ?? "";
}

function normalizeSearchTerm(value: string) {
  return value.replace(/폼룰러/g, "폼롤러").replace(/\s+/g, " ").trim();
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.title}:${result.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
