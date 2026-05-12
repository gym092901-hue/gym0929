import { z } from "zod";

export const HumanAnatomyIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(),
  fix: z.string()
});

export const HumanAnatomyReportSchema = z.object({
  verdict: z.enum(["pass", "needs_revision", "fail"]),
  score: z.number().int().min(0).max(100),
  checklist: z.object({
    adultHumanOnly: z.boolean(),
    plausibleLimbCount: z.boolean(),
    naturalJointAlignment: z.boolean(),
    handsAndFeetReadable: z.boolean(),
    productContactClear: z.boolean(),
    safeExercisePosture: z.boolean(),
    noSevereDistortion: z.boolean()
  }),
  issues: z.array(HumanAnatomyIssueSchema).default([]),
  requiredFixes: z.array(z.string()).default([]),
  promptGuardrails: z.array(z.string()).default([]),
  negativePrompt: z.string()
});

export type HumanAnatomyIssue = z.infer<typeof HumanAnatomyIssueSchema>;
export type HumanAnatomyReport = z.infer<typeof HumanAnatomyReportSchema>;
