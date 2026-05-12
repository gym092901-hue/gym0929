import { describe, expect, it } from "vitest";
import { ProductPageBlockedError, isBlockedProductPage } from "@/lib/ingestion/scrape-product-page";

describe("isBlockedProductPage", () => {
  it("detects Coupang-style access denied pages", () => {
    expect(
      isBlockedProductPage({
        title: "Access Denied",
        text: "You don't have permission to access this server.",
        html: "<TITLE>Access Denied</TITLE>",
        finalUrl: "https://www.coupang.com/vp/products/1"
      })
    ).toBe(true);
  });

  it("does not mark normal product pages as blocked", () => {
    expect(
      isBlockedProductPage({
        title: "Sample product",
        text: "Price 12,900. Buy now.",
        html: "<title>Sample product</title>",
        finalUrl: "https://example.com/products/1"
      })
    ).toBe(false);
  });

  it("explains why Coupang short links cannot be scraped reliably", () => {
    const error = new ProductPageBlockedError(
      "www.coupang.com",
      "https://link.coupang.com/a/dF35xvlxGm",
      "https://www.coupang.com/vp/products/1"
    );

    expect(error.message).toContain("쿠팡 공개 상세페이지");
    expect(error.message).toContain("sellerProductId");
  });
});
