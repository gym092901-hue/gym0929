import { z } from "zod";

export const ComplianceReportSchema = z.object({
  id: z.string(),
  targetType: z.enum(["product_truth", "angle", "hook", "storyboard", "render"]),
  targetId: z.string(),
  verdict: z.enum(["pass", "needs_revision", "fail"]),
  unsupportedClaims: z
    .array(
      z.object({
        text: z.string(),
        reason: z.string()
      })
    )
    .default([]),
  riskyClaims: z
    .array(
      z.object({
        text: z.string(),
        riskType: z.string(),
        severity: z.enum(["low", "medium", "high"])
      })
    )
    .default([]),
  fakeReviewDetected: z.boolean().default(false),
  productNameInFirstTwoSeconds: z.boolean().default(false),
  ctaBeforeLastFiveSeconds: z.boolean().default(false),
  missingEvidenceIds: z.array(z.string()).default([]),
  requiredFixes: z.array(z.string()).default([])
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
