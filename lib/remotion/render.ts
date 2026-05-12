import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma/client";
import { fromJsonString } from "@/lib/utils/json";
import { ensureNarrationAudio } from "@/lib/tts/narration";
import type { ShortsRenderProps } from "./types";

export async function renderStoryboardToMp4(storyboardId: string) {
  const storyboard = await prisma.storyboard.findUniqueOrThrow({
    where: { id: storyboardId },
    include: {
      product: true,
      proofScenes: { orderBy: { orderIndex: "asc" } }
    }
  });
  const assets = await prisma.sourceAsset.findMany({ where: { productId: storyboard.productId } });
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  const render = await prisma.videoRender.create({
    data: {
      productId: storyboard.productId,
      storyboardId,
      status: "rendering",
      variant: storyboard.renderVariant,
      durationSec: storyboard.durationSec
    }
  });

  const outputDir = path.join(process.cwd(), "storage", "renders");
  const outputLocation = path.join(outputDir, `${render.id}.mp4`);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    const scenes = storyboard.proofScenes.map((scene) => {
      const media = readJsonArray<string>(scene.assetIds)
        .map((assetId) => assetMap.get(assetId))
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
      return {
        id: scene.id,
        type: scene.type,
        durationSec: scene.durationSec,
        visualPlan: scene.visualPlan,
        narration: scene.narration,
        onScreenText: scene.onScreenText,
        assetUrls: media
          .map((asset) => asset.url)
          .filter((url): url is string => Boolean(url))
          .map(toRemotionAssetUrl),
        assetMedia: media
          .filter((asset) => asset.url)
          .map((asset) => ({
            url: toRemotionAssetUrl(asset.url!),
            kind: asset.kind,
            role: asset.role
          })),
        requiresUserShot: scene.requiresUserShot,
        shotRequest: scene.shotRequest ?? undefined
      };
    });
    const narrationAudioUrl = await ensureNarrationAudio({
      storyboardId,
      productName: storyboard.product.productName ?? "상품",
      scenes
    });
    const inputProps: ShortsRenderProps = {
      productName: storyboard.product.productName ?? "상품",
      variant: storyboard.renderVariant,
      durationSec: storyboard.durationSec,
      narrationAudioUrl: narrationAudioUrl ? toRemotionAssetUrl(narrationAudioUrl) : undefined,
      scenes
    };
    await renderWithRetry(inputProps, outputLocation);
    await prisma.videoRender.update({
      where: { id: render.id },
      data: {
        status: "complete",
        filePath: outputLocation,
        width: 1080,
        height: 1920,
        durationSec: storyboard.durationSec
      }
    });
  } catch (error) {
    await prisma.videoRender.update({
      where: { id: render.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        filePath: outputLocation
      }
    });
    throw error;
  }

  await prisma.productProject.update({
    where: { id: storyboard.productId },
    data: { status: "rendered" }
  });

  return prisma.videoRender.findUniqueOrThrow({ where: { id: render.id } });
}

export async function renderTopStoryboards(productId: string, minimum = 3) {
  const storyboards = await prisma.storyboard.findMany({
    where: { productId },
    include: { renders: true },
    orderBy: { createdAt: "asc" },
  });
  const renders = [];
  for (const storyboard of storyboards.slice(0, minimum)) {
    const completeRender = storyboard.renders.find((render) => render.status === "complete");
    if (completeRender) {
      renders.push(completeRender);
      continue;
    }
    renders.push(await renderStoryboardToMp4(storyboard.id));
  }
  return renders;
}

async function renderWithRetry(inputProps: ShortsRenderProps, outputLocation: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const serveUrl = await bundle({
        entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
        webpackOverride: (config) => config
      });
      const composition = await selectComposition({
        serveUrl,
        id: "ShortsVideo",
        inputProps
      });
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation,
        inputProps
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function readJsonArray<T>(value: unknown): T[] {
  return fromJsonString<T[]>(value, []);
}

function toRemotionAssetUrl(url: string): string {
  if (url.startsWith("/public/")) return url;
  if (url.startsWith("/")) return `/public${url}`;
  return url;
}
