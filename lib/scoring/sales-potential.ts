import type { ProductTruth } from "@/lib/schemas/product-truth";
import { clampScore, gradeScore, highRiskClaimWords, includesAny, ratioScore } from "./helpers";

export type SalesPotentialInput = {
  truth: ProductTruth;
  evidenceCount: number;
  assetCount: number;
};

export type SalesPotentialResult = {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
  penalties: Record<string, number>;
  rationale: string;
};

export function scoreShortsSalesPotential(input: SalesPotentialInput): SalesPotentialResult {
  const { truth, evidenceCount, assetCount } = input;
  const usageImageCount = truth.images.filter((image) => image.role === "usage").length;
  const beforeAfterCount = truth.images.filter((image) => image.role === "before_after").length;
  const hasPrice = truth.price.amount !== null || truth.price.rawText.length > 0;
  const hasPurchaseLink = truth.purchaseLinks.length > 0;
  const safeClaimCount = truth.allowedClaims.length;
  const riskText = [
    ...truth.allowedClaims.map((claim) => claim.text),
    ...truth.benefits.map((benefit) => benefit.text)
  ].join(" ");
  const hasRiskyClaimLanguage = includesAny(riskText, highRiskClaimWords);

  const breakdown = {
    problemClarity: ratioScore(truth.benefits.length + truth.usageSteps.length, 5, 15),
    demonstrability: ratioScore(usageImageCount + truth.usageSteps.length, 4, 15),
    evidenceSufficiency: ratioScore(evidenceCount + safeClaimCount, 18, 15),
    beforeAfterPotential: ratioScore(beforeAfterCount + safeClaimCount, 3, 10),
    buyingUrgency: ratioScore(truth.benefits.length + truth.cautions.length, 5, 10),
    lowFriction: (hasPrice ? 5 : 0) + (hasPurchaseLink ? 5 : 0),
    differentiation: ratioScore(truth.facts.length, 8, 10),
    complianceSafety: hasRiskyClaimLanguage ? 4 : 10,
    ctaFit: hasPurchaseLink ? 5 : 0
  };

  const penalties: Record<string, number> = {};
  if (safeClaimCount === 0) penalties.noEvidenceBackedClaims = -25;
  if (usageImageCount === 0 && truth.usageSteps.length === 0) penalties.noUsageProof = -15;
  if (assetCount < 3) penalties.assetShortage = -10;
  if (!hasPrice || !hasPurchaseLink) penalties.priceOrLinkMissing = -10;
  if (hasRiskyClaimLanguage) penalties.highRiskClaimLanguage = -20;

  const positive = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const negative = Object.values(penalties).reduce((sum, value) => sum + value, 0);
  const score = clampScore(positive + negative);

  const rationale =
    score >= 70
      ? "상세페이지 근거와 쇼츠 장면화 가능성이 충분합니다."
      : "쇼츠 판매 설계에 필요한 근거, 사용 장면, 구매 연결 정보가 더 필요합니다.";

  return {
    score,
    grade: gradeScore(score),
    breakdown,
    penalties,
    rationale
  };
}
