import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getProductWorkspace } from "@/lib/services/product-service";
import { saveUploadedManualImages, type UploadedManualImage } from "@/lib/services/manual-product-service";
import { fromJsonString, toJsonString } from "@/lib/utils/json";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const uploads = await collectUploads(formData);
    if (uploads.length === 0) {
      return NextResponse.json({ error: "업로드할 이미지나 영상을 선택하세요." }, { status: 400 });
    }

    await prisma.productProject.findUniqueOrThrow({ where: { id } });
    const assetSeeds = await saveUploadedManualImages(id, uploads);
    const createdAssets = [];

    for (const asset of assetSeeds) {
      createdAssets.push(
        await prisma.sourceAsset.create({
          data: {
            productId: id,
            kind: asset.kind,
            role: asset.role || "usage",
            url: asset.url,
            localPath: asset.localPath,
            altText: asset.altText,
            metadata: toJsonString({
              ...(asset.metadata ?? {}),
              provider: "chatgpt-pro-manual-upload"
            })
          }
        })
      );
    }

    await attachAssetsToUsageScenes(id, createdAssets.map((asset) => asset.id));
    await prisma.productProject.update({ where: { id }, data: { status: "assets_updated" } });

    return NextResponse.json(await getProductWorkspace(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지/영상 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}

async function collectUploads(formData: FormData): Promise<UploadedManualImage[]> {
  const values = formData.getAll("assets");
  const uploads: UploadedManualImage[] = [];

  for (const value of values) {
    if (!(value instanceof File) || value.size === 0) continue;
    uploads.push({
      originalName: value.name,
      contentType: value.type,
      bytes: Buffer.from(await value.arrayBuffer())
    });
  }

  return uploads;
}

async function attachAssetsToUsageScenes(productId: string, assetIds: string[]) {
  if (assetIds.length === 0) return;

  const scenes = await prisma.proofScene.findMany({
    where: {
      storyboard: { productId },
      OR: [{ type: "usage" }, { requiresUserShot: true }]
    },
    orderBy: [{ storyboardId: "asc" }, { orderIndex: "asc" }]
  });

  if (scenes.length === 0) return;

  for (let index = 0; index < assetIds.length; index += 1) {
    const scene = scenes[index % scenes.length];
    const currentAssetIds = fromJsonString<string[]>(scene.assetIds, []);
    await prisma.proofScene.update({
      where: { id: scene.id },
      data: {
        assetIds: toJsonString([assetIds[index], ...currentAssetIds.filter((id) => id !== assetIds[index])]),
        requiresUserShot: false,
        shotRequest: null
      }
    });
  }
}
