import type { ComplianceReport } from "@/lib/schemas/compliance-report";
import type { HookCandidate } from "@/lib/schemas/hook-candidate";
import type { ProductTruth } from "@/lib/schemas/product-truth";
import type { Storyboard } from "@/lib/schemas/storyboard";
import { highRiskClaimWords, includesAny } from "@/lib/scoring/helpers";
import { startsWithProductName } from "@/lib/scoring/hook-score";

type ReportInput = {
  productId: string;
  targetType: ComplianceReport["targetType"];
  targetId: string;
};

export function checkHookCompliance(
  input: ReportInput,
  hook: Pick<HookCandidate, "text" | "supportedClaimIds">,
  truth: ProductTruth
): ComplianceReport {
  const unsupportedClaims =
    hook.supportedClaimIds.length === 0
      ? [{ text: hook.text, reason: "후킹 문장이 상세페이지 근거 claim과 연결되지 않았습니다." }]
      : [];
  const riskyClaims = includesAny(hook.text, highRiskClaimWords)
    ? [{ text: hook.text, riskType: "overclaim", severity: "high" as const }]
    : [];
  const productNameInFirstTwoSeconds = startsWithProductName(hook.text, truth.productName);
  const requiredFixes: string[] = [];
  if (unsupportedClaims.length > 0) requiredFixes.push("상세페이지 근거가 연결된 후킹으로 수정");
  if (riskyClaims.length > 0) requiredFixes.push("과장/효능/보장 표현 제거");
  if (productNameInFirstTwoSeconds) requiredFixes.push("첫 2초를 상품명이 아닌 문제/결과/전후 차이로 시작");

  return {
    id: `compliance_${input.targetId}`,
    targetType: input.targetType,
    targetId: input.targetId,
    verdict: requiredFixes.length === 0 ? "pass" : "fail",
    unsupportedClaims,
    riskyClaims,
    fakeReviewDetected: /후기|리뷰|고객님|구매자/.test(hook.text),
    productNameInFirstTwoSeconds,
    ctaBeforeLastFiveSeconds: false,
    missingEvidenceIds: [],
    requiredFixes
  };
}

export function checkStoryboardCompliance(
  input: ReportInput,
  storyboard: Storyboard,
  truth: ProductTruth
): ComplianceReport {
  const unsupportedClaims = storyboard.scenes
    .filter((scene) => scene.evidenceIds.length === 0 && scene.type !== "cta")
    .map((scene) => ({
      text: scene.onScreenText,
      reason: "CTA가 아닌 장면에 연결된 상세페이지 근거가 없습니다."
    }));
  const riskyClaims = storyboard.scenes
    .filter((scene) => includesAny(`${scene.narration} ${scene.onScreenText}`, highRiskClaimWords))
    .map((scene) => ({
      text: scene.onScreenText,
      riskType: "overclaim",
      severity: "high" as const
    }));
  const firstScene = storyboard.scenes[0];
  const productNameInFirstTwoSeconds = firstScene
    ? startsWithProductName(`${firstScene.onScreenText} ${firstScene.narration}`, truth.productName)
    : false;
  const ctaBeforeLastFiveSeconds = storyboard.cta.startsAtSec < storyboard.durationSec - 5;
  const missingEvidenceIds = storyboard.scenes
    .flatMap((scene) => scene.evidenceIds)
    .filter((evidenceId) => evidenceId.startsWith("missing:"));
  const fakeReviewDetected = storyboard.scenes.some((scene) => /후기|리뷰|고객님|구매자/.test(scene.narration));

  const requiredFixes: string[] = [];
  if (unsupportedClaims.length > 0) requiredFixes.push("근거 없는 장면 문구에 evidenceId 연결 또는 문구 삭제");
  if (riskyClaims.length > 0) requiredFixes.push("과장/효능/보장 표현 제거");
  if (productNameInFirstTwoSeconds) requiredFixes.push("첫 장면을 문제/결과/전후 차이 중심으로 수정");
  if (ctaBeforeLastFiveSeconds) requiredFixes.push("CTA를 마지막 5초 안으로 이동");
  if (fakeReviewDetected) requiredFixes.push("실제 출처 없는 리뷰/후기 표현 제거");

  return {
    id: `compliance_${input.targetId}`,
    targetType: input.targetType,
    targetId: input.targetId,
    verdict: requiredFixes.length === 0 ? "pass" : "needs_revision",
    unsupportedClaims,
    riskyClaims,
    fakeReviewDetected,
    productNameInFirstTwoSeconds,
    ctaBeforeLastFiveSeconds,
    missingEvidenceIds,
    requiredFixes
  };
}
