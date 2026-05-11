import { z } from "zod";

export const HookPatternSchema = z.enum([
  "problem",
  "result",
  "before_after",
  "mistake",
  "surprise",
  "avoidance"
]);

export const HookCandidateSchema = z.object({
  id: z.string(),
  angleId: z.string(),
  text: z.string().min(1).max(80),
  pattern: HookPatternSchema,
  startsWithProductName: z.boolean(),
  supportedClaimIds: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  score: z.number().int().min(0).max(100),
  decision: z.enum(["keep", "revise", "reject"]),
  rejectionReason: z.string().optional()
});

export const HookCandidatesSchema = z.object({
  hooks: z.array(HookCandidateSchema).min(1).max(40)
});

export type HookCandidate = z.infer<typeof HookCandidateSchema>;
export type HookPattern = z.infer<typeof HookPatternSchema>;
