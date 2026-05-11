import { z } from "zod";

export const ConversionPackageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  videoRenderIds: z.array(z.string()).min(1),
  titles: z.array(
    z.object({
      videoRenderId: z.string(),
      text: z.string().min(1).max(100),
      score: z.number().int().min(0).max(100)
    })
  ),
  descriptions: z.array(
    z.object({
      videoRenderId: z.string(),
      text: z.string().min(1)
    })
  ),
  pinnedComments: z.array(
    z.object({
      videoRenderId: z.string(),
      text: z.string().min(1).max(500)
    })
  ),
  hashtags: z.array(z.string()).default([]),
  productTagPriority: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        priority: z.number().int().positive(),
        reason: z.string()
      })
    )
    .default([]),
  manualUploadChecklist: z.array(z.string()).default([]),
  performanceInputTemplate: z.array(z.string()).default([])
});

export type ConversionPackage = z.infer<typeof ConversionPackageSchema>;
