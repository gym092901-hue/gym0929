import { describe, expect, it } from "vitest";
import {
  buildProductSearchQuery,
  buildWebSearchFallback,
  inferProductNameFromQuery,
  shouldUseWebSearchFallback
} from "@/lib/ingestion/web-search-fallback";

describe("web search fallback", () => {
  const smartStoreUrl =
    "https://smartstore.naver.com/bfit/products/10306125319?n_query=%ED%8F%BC%EB%A3%B0%EB%9F%AC&n_mall_pid=10306125319";

  it("builds a same-product search query from smartstore ad URLs", () => {
    const query = buildProductSearchQuery(smartStoreUrl);

    expect(query).toContain("bfit");
    expect(query).toContain("폼롤러");
    expect(query).toContain("10306125319");
  });

  it("infers a product name from store slug and query", () => {
    const query = buildProductSearchQuery(smartStoreUrl);

    expect(inferProductNameFromQuery(smartStoreUrl, query)).toBe("BFIT 폼롤러");
  });

  it("detects naver error pages as fallback candidates", () => {
    expect(
      shouldUseWebSearchFallback({
        title: "[에러] 에러페이지 - 시스템오류",
        text: "현재 서비스 접속이 불가합니다. 동시에 접속하는 이용자 수가 많거나",
        images: []
      })
    ).toBe(true);
  });

  it("creates fallback evidence from search results without requiring a live network", async () => {
    const html = `
      <html>
        <head><title>BFIT EVA 폼롤러 : 네이버 검색</title><meta name="description" content="홈트레이닝 폼롤러 검색 결과" /></head>
        <body><a href="https://example.com/product">BFIT EVA 폼롤러 운동 스트레칭</a></body>
      </html>
    `;
    const fetcher = async () => new Response(html, { status: 200 }) as Response;

    const fallback = await buildWebSearchFallback(smartStoreUrl, "blocked", fetcher as typeof fetch);

    expect(fallback.productName).toBe("BFIT 폼롤러");
    expect(fallback.evidence.some((item) => item.kind === "purchase_link")).toBe(true);
    expect(fallback.evidence.some((item) => item.text.includes("BFIT EVA 폼롤러"))).toBe(true);
  });
});
