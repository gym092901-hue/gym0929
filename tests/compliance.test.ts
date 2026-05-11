import { describe, expect, it } from "vitest";
import { checkHookCompliance } from "@/lib/compliance/rules";
import type { ProductTruth } from "@/lib/schemas";

const truth: ProductTruth = {
  schemaVersion: "2026-05-11",
  productName: "테스트 상품",
  category: null,
  brand: null,
  price: { amount: null, currency: "KRW", rawText: "", evidenceIds: [] },
  purchaseLinks: [],
  facts: [],
  benefits: [],
  usageSteps: [],
  cautions: [],
  images: [],
  allowedClaims: [],
  missingInfo: []
};

describe("compliance", () => {
  it("fails unsupported fake-review-like hooks", () => {
    const report = checkHookCompliance(
      { productId: "p1", targetType: "hook", targetId: "h1" },
      { text: "구매자 리뷰가 증명한 기적의 효과", supportedClaimIds: [] },
      truth
    );
    expect(report.verdict).toBe("fail");
    expect(report.fakeReviewDetected).toBe(true);
    expect(report.requiredFixes.length).toBeGreaterThan(0);
  });
});
