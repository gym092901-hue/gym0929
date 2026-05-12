import { describe, expect, it } from "vitest";
import { isCoupangPartnersWidgetUrl, parseCoupangPartnersUrl } from "@/lib/ingestion/coupang-partners-widget";

describe("Coupang Partners widget parsing", () => {
  it("recognizes coupa.ng and widget CDN URLs", () => {
    expect(isCoupangPartnersWidgetUrl("https://coupa.ng/cmPYDP")).toBe(true);
    expect(isCoupangPartnersWidgetUrl("https://partners.coupangcdn.com/widget/product-banner/default/index.html")).toBe(
      true
    );
    expect(isCoupangPartnersWidgetUrl("https://www.coupang.com/vp/products/1")).toBe(false);
  });

  it("extracts product metadata from redirected widget URLs", () => {
    const finalUrl =
      "https://partners.coupangcdn.com/widget/product-banner/default/index.html?" +
      new URLSearchParams({
        trackingCode: "AF2752894",
        linkUrl: "https://link.coupang.com/re/AFFSDP?lptag=AF2752894&pageKey=6593263399&itemId=14886480004",
        productImage: "https://t1a.coupangcdn.com/image.jpg",
        productDescription: "코멧 스포츠 EPP 컴포트 폼롤러, 블랙, 1개"
      }).toString();

    expect(parseCoupangPartnersUrl("https://coupa.ng/cmPYDP", finalUrl)).toMatchObject({
      productName: "코멧 스포츠 EPP 컴포트 폼롤러, 블랙, 1개",
      productImage: "https://t1a.coupangcdn.com/image.jpg",
      purchaseLink: "https://link.coupang.com/re/AFFSDP?lptag=AF2752894&pageKey=6593263399&itemId=14886480004",
      pageKey: "6593263399",
      itemId: "14886480004",
      trackingCode: "AF2752894"
    });
  });
});
