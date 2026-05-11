import type { HookCandidate } from "@/lib/schemas/hook-candidate";
import type { ProductTruth } from "@/lib/schemas/product-truth";
import { clampScore, highRiskClaimWords, includesAny } from "./helpers";

export type HookScoreResult = Pick<
  HookCandidate,
  "score" | "decision" | "rejectionReason" | "riskFlags" | "startsWithProductName"
> & {
  breakdown: Record<string, number>;
};

const productStartPatterns = ["제품", "상품"];

export function startsWithProductName(text: string, productName: string | null): boolean {
  const compact = text.trim().replace(/^["'“”‘’]/, "");
  if (productName && compact.startsWith(productName)) {
    return true;
  }
  return productStartPatterns.some((pattern) => compact.startsWith(pattern));
}

export function scoreHookCandidate(text: string, truth: ProductTruth, supportedClaimIds: string[]): HookScoreResult {
  const startsWithName = startsWithProductName(text, truth.productName);
  const riskFlags: string[] = [];
  if (startsWithName) riskFlags.push("product_name_first");
  if (includesAny(text, highRiskClaimWords)) riskFlags.push("risky_claim_language");
  if (supportedClaimIds.length === 0) riskFlags.push("missing_supported_claim");
  if (text.length > 55) riskFlags.push("too_long_for_two_seconds");

  const problemWords = ["왜", "아직", "불편", "실수", "전", "후", "차이", "놓치", "낭비", "막히"];
  const curiosityWords = ["이유", "차이", "몰랐", "의외", "한 번", "바로", "먼저"];
  const visualWords = ["보면", "장면", "전후", "사용", "비교", "확인"];

  const breakdown = {
    firstTwoSecondClarity: includesAny(text, problemWords) ? 20 : 10,
    curiosity: includesAny(text, curiosityWords) ? 15 : 8,
    visualProof: includesAny(text, visualWords) ? 15 : 8,
    evidenceFit: Math.min(15, supportedClaimIds.length * 5),
    specificity: /\d|전후|사용|가격|시간|초|분/.test(text) ? 10 : 6,
    brevity: text.length <= 36 ? 10 : text.length <= 55 ? 7 : 3,
    angleFit: supportedClaimIds.length > 0 ? 10 : 4,
    safety: riskFlags.length === 0 ? 5 : 0
  };

  let score = clampScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  if (startsWithName || includesAny(text, highRiskClaimWords) || supportedClaimIds.length === 0) {
    score = Math.min(score, 49);
  }

  const rejectionReason =
    startsWithName
      ? "첫 2초가 상품명으로 시작합니다."
      : includesAny(text, highRiskClaimWords)
        ? "근거가 필요하거나 과장 위험이 큰 표현이 포함되어 있습니다."
        : supportedClaimIds.length === 0
          ? "상세페이지 근거와 연결되지 않았습니다."
          : undefined;

  return {
    score,
    startsWithProductName: startsWithName,
    riskFlags,
    decision: score >= 70 ? "keep" : score >= 50 ? "revise" : "reject",
    rejectionReason,
    breakdown
  };
}
