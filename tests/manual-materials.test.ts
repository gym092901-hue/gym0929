import { describe, expect, it } from "vitest";
import {
  buildManualAssetSeeds,
  buildManualEvidenceSeeds,
  normalizeManualImageUrls
} from "@/lib/ingestion/manual-materials";
import { mergeManualInputWithSource } from "@/lib/services/manual-product-service";

describe("manual product materials", () => {
  it("turns user-provided facts into evidence", () => {
    const evidence = buildManualEvidenceSeeds({
      productName: "테스트 상품",
      priceText: "12,900원",
      purchaseLink: "example.com/product",
      benefits: "간편하게 사용할 수 있습니다.",
      usage: "뚜껑을 열고 내용물을 넣습니다.",
      cautions: "사용 전 반드시 세척하세요.",
      imageNotes: "사진에서 손으로 사용하는 장면이 확인됩니다."
    });

    expect(evidence.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["page_title", "price", "purchase_link", "benefit", "usage", "caution"])
    );
    expect(evidence.find((item) => item.kind === "purchase_link")?.url).toBe("https://example.com/product");
  });

  it("normalizes and dedupes image URLs", () => {
    expect(normalizeManualImageUrls(["example.com/a.jpg", "https://example.com/a.jpg", "ftp://bad.example/a.jpg"])).toEqual([
      "https://example.com/a.jpg"
    ]);
  });

  it("infers asset roles from image names", () => {
    expect(
      buildManualAssetSeeds({
        productName: "테스트 상품",
        imageUrls: ["https://example.com/usage-cut.jpg", "https://example.com/before-after.jpg"]
      }).map((asset) => asset.role)
    ).toEqual(["usage", "before_after"]);
  });

  it("merges Coupang widget metadata with manual materials", () => {
    const merged = mergeManualInputWithSource(
      {
        sourceSnippet: '<iframe src="https://coupa.ng/cmPYDP"></iframe>',
        productName: "",
        purchaseLink: "",
        imageUrls: ["https://example.com/user-usage.jpg"]
      },
      {
        sourceUrl: "https://partners.coupangcdn.com/widget/product-banner/default/index.html",
        widget: {
          requestedUrl: "https://coupa.ng/cmPYDP",
          finalUrl: "https://partners.coupangcdn.com/widget/product-banner/default/index.html",
          productName: "코멧 스포츠 EPP 컴포트 폼롤러, 블랙, 1개",
          productImage: "https://t1a.coupangcdn.com/product.jpg",
          purchaseLink: "https://link.coupang.com/re/AFFSDP?pageKey=1"
        }
      }
    );

    expect(merged.productName).toBe("코멧 스포츠 EPP 컴포트 폼롤러, 블랙, 1개");
    expect(merged.purchaseLink).toBe("https://link.coupang.com/re/AFFSDP?pageKey=1");
    expect(merged.imageUrls).toEqual([
      "https://t1a.coupangcdn.com/product.jpg",
      "https://example.com/user-usage.jpg"
    ]);
  });
});
