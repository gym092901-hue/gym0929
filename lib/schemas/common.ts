import { z } from "zod";

export const SCHEMA_VERSION = "2026-05-11";

export const EvidenceIdSchema = z.string().min(1);

export const ScoreBreakdownSchema = z.record(z.string(), z.number().min(0).max(100));

export const EvidenceLinkedTextSchema = z.object({
  text: z.string().min(1),
  evidenceIds: z.array(EvidenceIdSchema).default([])
});

export const AssetRoleSchema = z.enum([
  "product",
  "usage",
  "before_after",
  "detail",
  "price",
  "caution",
  "unknown"
]);

export type EvidenceLinkedText = z.infer<typeof EvidenceLinkedTextSchema>;
export type AssetRole = z.infer<typeof AssetRoleSchema>;
