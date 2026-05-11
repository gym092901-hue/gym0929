import { describe, expect, it } from "vitest";
import { scoreHookCandidate, scoreSalesAngle, scoreShortsSalesPotential } from "@/lib/scoring";
import type { ProductTruth } from "@/lib/schemas";

const truth: ProductTruth = {
  schemaVersion: "2026-05-11",
  productName: "테스트 상품",
  category: "생활",
  brand: null,
  price: { amount: 12900, currency: "KRW", rawText: "12,900원", evidenceIds: ["e-price"] },
  purchaseLinks: [{ label: "구매하기", url: "https://example.com/buy", evidenceIds: ["e-link"] }],
  facts: [
    { text: "간편하게 사용할 수 있습니다.", type: "feature", evidenceIds: ["e1"] },
    { text: "사용 방법은 상세페이지에 안내되어 있습니다.", type: "usage", evidenceIds: ["e2"] }
  ],
  benefits: [{ text: "사용이 간편합니다.", evidenceIds: ["e1"], claimSafe: true }],
  usageSteps: [{ step: 1, text: "손으로 눌러 사용합니다.", evidenceIds: ["e2"] }],
  cautions: [],
  images: [{ assetId: "a1", role: "usage" }],
  allowedClaims: [{ text: "사용이 간편합니다.", claimType: "benefit", evidenceIds: ["e1"], confidence: 0.8 }],
  missingInfo: []
};

describe("scoring", () => {
  it("scores a supported product above weak products", () => {
    const result = scoreShortsSalesPotential({ truth, evidenceCount: 12, assetCount: 5 });
    expect(result.score).toBeGreaterThan(50);
  });

  it("rejects hooks starting with product name", () => {
    const result = scoreHookCandidate("테스트 상품 먼저 보세요", truth, ["c1"]);
    expect(result.decision).toBe("reject");
    expect(result.startsWithProductName).toBe(true);
  });

  it("scores sales angles with evidence", () => {
    const result = scoreSalesAngle({
      truth,
      customerPain: "구매 전 실제 사용이 쉬운지 알기 어렵다",
      buyingMotive: "간단히 사용할 수 있으면 바로 구매하고 싶다",
      corePromise: "사용이 간편합니다.",
      proofStrategy: "사용 장면을 먼저 보여준다",
      requiredEvidenceIds: ["e1", "e2"],
      objectionToRemove: ["사용법 걱정"],
      riskFlags: []
    });
    expect(result.score).toBeGreaterThanOrEqual(55);
  });
});
