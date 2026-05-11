import { z } from "zod";

export const PerformanceInputSchema = z.object({
  videoRenderId: z.string().optional(),
  views: z.number().int().nonnegative().optional(),
  avgViewDuration: z.number().nonnegative().optional(),
  retentionRate: z.number().min(0).max(100).optional(),
  clickThroughRate: z.number().min(0).max(100).optional(),
  purchases: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  notes: z.string().optional()
});

export type PerformanceInput = z.infer<typeof PerformanceInputSchema>;
