import type { ProductTruth } from "@/lib/schemas/product-truth";
import { clampScore, highRiskClaimWords, includesAny, ratioScore } from "./helpers";

export type SalesAngleScoreInput = {
  customerPain: string;
  buyingMotive: string;
  corePromise: string;
  requiredEvidenceIds: string[];
  proofStrategy: string;
  objectionToRemove: string[];
  riskFlags?: string[];
  truth: ProductTruth;
};

export type SalesAngleScoreResult = {
  score: number;
  scoreBreakdown: Record<string, number>;
  riskFlags: string[];
};

export function scoreSalesAngle(input: SalesAngleScoreInput): SalesAngleScoreResult {
  const riskFlags = [...(input.riskFlags ?? [])];
  const combined = [input.customerPain, input.buyingMotive, input.corePromise, input.proofStrategy].join(" ");
  if (includesAny(combined, highRiskClaimWords)) {
    riskFlags.push("risky_claim_language");
  }
  if (input.requiredEvidenceIds.length === 0) {
    riskFlags.push("missing_evidence");
  }

  const usageProofAvailable = input.truth.images.some((image) => image.role === "usage") || input.truth.usageSteps.length > 0;

  const scoreBreakdown = {
    painIntensity: Math.min(20, Math.max(8, input.customerPain.length / 4)),
    evidenceStrength: ratioScore(input.requiredEvidenceIds.length, 4, 20),
    sceneProof: usageProofAvailable || input.proofStrategy.length > 20 ? 15 : 7,
    motiveStrength: Math.min(15, Math.max(6, input.buyingMotive.length / 5)),
    differentiation: ratioScore(input.truth.facts.length + input.truth.benefits.length, 8, 10),
    objectionRemoval: ratioScore(input.objectionToRemove.length, 3, 10),
    complianceSafety: riskFlags.length === 0 ? 10 : 4
  };

  let score = clampScore(Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0));
  if (riskFlags.includes("missing_evidence")) {
    score = Math.min(score, 60);
  }
  if (riskFlags.includes("risky_claim_language")) {
    score = Math.min(score, 55);
  }

  return {
    score,
    scoreBreakdown,
    riskFlags: [...new Set(riskFlags)]
  };
}
