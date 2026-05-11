import { z } from "zod";
import { EvidenceIdSchema, ScoreBreakdownSchema } from "./common";

export const SalesAngleSchema = z.object({
  id: z.string(),
  productId: z.string(),
  angle: z.string().min(1),
  targetCustomer: z.string().min(1),
  customerPain: z.string().min(1),
  buyingMotive: z.string().min(1),
  corePromise: z.string().min(1),
  proofStrategy: z.string().min(1),
  requiredEvidenceIds: z.array(EvidenceIdSchema).default([]),
  objectionToRemove: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  score: z.number().int().min(0).max(100),
  scoreBreakdown: ScoreBreakdownSchema
});

export const SalesAnglesSchema = z.object({
  angles: z.array(SalesAngleSchema).min(1).max(10)
});

export type SalesAngle = z.infer<typeof SalesAngleSchema>;
