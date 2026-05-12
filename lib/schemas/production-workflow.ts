import { z } from "zod";
import { HumanAnatomyReportSchema } from "./human-anatomy-report";

export const ProductionPhaseSchema = z.object({
  id: z.enum(["truth", "sales_design", "image_reference", "veo_motion", "remotion_render", "manual_upload", "learn"]),
  label: z.string(),
  status: z.enum(["ready", "waiting", "blocked", "complete"]),
  detail: z.string()
});

export const ProductionScenePackageSchema = z.object({
  storyboardId: z.string(),
  sceneId: z.string(),
  sceneType: z.string(),
  onScreenText: z.string(),
  narration: z.string(),
  imageSource: z.enum(["chatgpt-pro-manual", "uploaded", "openai-api"]),
  videoSource: z.enum(["veo3", "uploaded", "remotion-motion"]),
  chatGptImagePrompt: z.string(),
  veoPrompt: z.string(),
  anatomyReport: HumanAnatomyReportSchema,
  existingAssetIds: z.array(z.string()).default([]),
  missingInputs: z.array(z.string()).default([]),
  nextAction: z.string()
});

export const ProductionWorkflowPackageSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  mode: z.literal("sales-design-first-human-in-loop"),
  imageGenerationMode: z.literal("chatgpt-pro-manual"),
  videoGenerationMode: z.literal("veo3-or-uploaded-footage"),
  phases: z.array(ProductionPhaseSchema),
  scenePackages: z.array(ProductionScenePackageSchema),
  renderReadiness: z.object({
    hasTruth: z.boolean(),
    hasSalesDesign: z.boolean(),
    imageReadyCount: z.number().int().min(0),
    videoReadyCount: z.number().int().min(0),
    scenePackageCount: z.number().int().min(0),
    readyForFinalRender: z.boolean()
  }),
  manualChecklist: z.array(z.string()).default([])
});

export type ProductionPhase = z.infer<typeof ProductionPhaseSchema>;
export type ProductionScenePackage = z.infer<typeof ProductionScenePackageSchema>;
export type ProductionWorkflowPackage = z.infer<typeof ProductionWorkflowPackageSchema>;
