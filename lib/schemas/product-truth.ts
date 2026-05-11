import { z } from "zod";
import { AssetRoleSchema, EvidenceIdSchema, SCHEMA_VERSION } from "./common";

export const ProductTruthSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  productName: z.string().nullable(),
  category: z.string().nullable(),
  brand: z.string().nullable(),
  price: z.object({
    amount: z.number().nullable(),
    currency: z.string().default("KRW"),
    rawText: z.string().default(""),
    evidenceIds: z.array(EvidenceIdSchema).default([])
  }),
  purchaseLinks: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        evidenceIds: z.array(EvidenceIdSchema).default([])
      })
    )
    .default([]),
  facts: z
    .array(
      z.object({
        text: z.string().min(1),
        type: z.enum(["spec", "material", "component", "feature", "usage", "caution"]),
        evidenceIds: z.array(EvidenceIdSchema).default([])
      })
    )
    .default([]),
  benefits: z
    .array(
      z.object({
        text: z.string().min(1),
        evidenceIds: z.array(EvidenceIdSchema).default([]),
        claimSafe: z.boolean().default(false)
      })
    )
    .default([]),
  usageSteps: z
    .array(
      z.object({
        step: z.number().int().positive(),
        text: z.string().min(1),
        evidenceIds: z.array(EvidenceIdSchema).default([])
      })
    )
    .default([]),
  cautions: z
    .array(
      z.object({
        text: z.string().min(1),
        severity: z.enum(["low", "medium", "high"]).default("low"),
        evidenceIds: z.array(EvidenceIdSchema).default([])
      })
    )
    .default([]),
  images: z
    .array(
      z.object({
        assetId: z.string().min(1),
        role: AssetRoleSchema
      })
    )
    .default([]),
  allowedClaims: z
    .array(
      z.object({
        text: z.string().min(1),
        claimType: z.string().min(1),
        evidenceIds: z.array(EvidenceIdSchema).min(1),
        confidence: z.number().min(0).max(1)
      })
    )
    .default([]),
  missingInfo: z.array(z.string()).default([])
});

export type ProductTruth = z.infer<typeof ProductTruthSchema>;
