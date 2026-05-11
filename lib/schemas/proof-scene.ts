import { z } from "zod";

export const ProofSceneTypeSchema = z.enum([
  "problem",
  "usage",
  "before_after",
  "objection_removal",
  "cta"
]);

export const ProofSceneSchema = z.object({
  id: z.string(),
  type: ProofSceneTypeSchema,
  durationSec: z.number().int().min(1).max(12),
  visualPlan: z.string().min(1),
  narration: z.string().min(1),
  onScreenText: z.string().min(1).max(90),
  assetIds: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([]),
  requiresUserShot: z.boolean().default(false),
  shotRequest: z.string().optional()
});

export type ProofScene = z.infer<typeof ProofSceneSchema>;
export type ProofSceneType = z.infer<typeof ProofSceneTypeSchema>;
