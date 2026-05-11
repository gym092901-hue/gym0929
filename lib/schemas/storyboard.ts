import { z } from "zod";
import { ProofSceneSchema } from "./proof-scene";

export const StoryboardSchema = z.object({
  id: z.string(),
  productId: z.string(),
  angleId: z.string(),
  hookId: z.string(),
  durationSec: z.number().int().min(20).max(35),
  aspectRatio: z.literal("9:16"),
  scenes: z.array(ProofSceneSchema).min(5),
  cta: z.object({
    text: z.string().min(1),
    startsAtSec: z.number().min(15),
    purchaseLinkId: z.string().nullable()
  }),
  missingShots: z.array(z.string()).default([]),
  complianceReportId: z.string().optional(),
  renderVariant: z.string().min(1)
});

export const StoryboardsSchema = z.object({
  storyboards: z.array(StoryboardSchema).min(1).max(5)
});

export type Storyboard = z.infer<typeof StoryboardSchema>;
