import { prisma } from "@/lib/prisma/client";
import {
  buildCoupangPartnersAssets,
  buildCoupangPartnersEvidence,
  buildCoupangPartnersTextSnapshot,
  isCoupangPartnersWidgetUrl,
  resolveCoupangPartnersWidget
} from "@/lib/ingestion/coupang-partners-widget";
import { buildAssetSeeds, buildEvidenceSeeds, extractPriceAmount } from "@/lib/ingestion/evidence";
import { scrapeProductPage } from "@/lib/ingestion/scrape-product-page";
import type { AssetRole } from "@/lib/schemas/common";
import { SCHEMA_VERSION } from "@/lib/schemas/common";
import type { ProductTruth } from "@/lib/schemas/product-truth";
import { ProductTruthSchema } from "@/lib/schemas/product-truth";
import { fromJsonString, toJsonString } from "@/lib/utils/json";

export async function ingestProduct(url: string) {
  if (isCoupangPartnersWidgetUrl(url)) {
    return ingestCoupangPartnersWidget(url);
  }

  const page = await scrapeProductPage(url);
  const assetSeeds = buildAssetSeeds(page);
  const evidenceSeeds = buildEvidenceSeeds(page);

  const product = await prisma.productProject.create({
    data: {
      sourceUrl: page.finalUrl,
      productName: page.title || null,
      status: "ingested"
    }
  });

  const source = await prisma.productSource.create({
    data: {
      productId: product.id,
      url: page.finalUrl,
      status: "complete",
      htmlSnapshot: page.html,
      textSnapshot: page.text,
      metadata: toJsonString(page.metadata)
    }
  });

  await prisma.sourceAsset.createMany({
    data: assetSeeds.map((asset) => ({
      productId: product.id,
      kind: asset.kind,
      role: asset.role,
      url: asset.url,
      altText: asset.altText,
      width: asset.width,
      height: asset.height,
      metadata: asset.metadata ? toJsonString(asset.metadata) : undefined
    }))
  });

  await prisma.evidenceItem.createMany({
    data: evidenceSeeds.map((item) => ({
      productId: product.id,
      sourceId: source.id,
      kind: item.kind,
      text: item.text,
      url: item.url,
      confidence: item.confidence,
      metadata: toJsonString(item.metadata ?? {})
    }))
  });

  return getProductWorkspace(product.id);
}

async function ingestCoupangPartnersWidget(url: string) {
  const widget = await resolveCoupangPartnersWidget(url);

  const product = await prisma.productProject.create({
    data: {
      sourceUrl: widget.finalUrl,
      productName: widget.productName,
      status: "ingested"
    }
  });

  const source = await prisma.productSource.create({
    data: {
      productId: product.id,
      url: widget.finalUrl,
      status: "complete",
      textSnapshot: buildCoupangPartnersTextSnapshot(widget),
      metadata: toJsonString({
        provider: "coupang-partners-widget",
        requestedUrl: widget.requestedUrl,
        finalUrl: widget.finalUrl,
        pageKey: widget.pageKey,
        itemId: widget.itemId,
        trackingCode: widget.trackingCode,
        traceId: widget.traceId
      })
    }
  });

  const assets = buildCoupangPartnersAssets(widget);
  if (assets.length > 0) {
    await prisma.sourceAsset.createMany({
      data: assets.map((asset) => ({
        productId: product.id,
        kind: asset.kind,
        role: asset.role,
        url: asset.url,
        altText: asset.altText,
        metadata: toJsonString(asset.metadata ?? {})
      }))
    });
  }

  await prisma.evidenceItem.createMany({
    data: buildCoupangPartnersEvidence(widget).map((item) => ({
      productId: product.id,
      sourceId: source.id,
      kind: item.kind,
      text: item.text,
      url: item.url,
      confidence: item.confidence,
      metadata: toJsonString(item.metadata ?? {})
    }))
  });

  return extractProductTruth(product.id);
}

export async function getProductWorkspace(productId: string) {
  const workspace = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      sources: { orderBy: { createdAt: "desc" }, take: 1 },
      assets: { orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
      truthSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      claims: { include: { evidence: true } },
      potential: true,
      pains: true,
      angles: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] },
      hooks: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] },
      storyboards: {
        orderBy: { createdAt: "asc" },
        include: { proofScenes: { orderBy: { orderIndex: "asc" } }, renders: true, hook: true, angle: true }
      },
      shotRequests: { orderBy: { createdAt: "desc" } },
      compliance: { orderBy: { createdAt: "desc" } },
      renders: { orderBy: { createdAt: "desc" } },
      packages: { orderBy: { createdAt: "desc" }, take: 1 },
      performance: { orderBy: { createdAt: "desc" } },
      improvements: { orderBy: { createdAt: "desc" }, take: 3 },
      promptRuns: {
        where: { task: { in: ["production_workflow_package", "chatgpt_pro_image_prompt_ready", "ai_media_prompt_ready"] } },
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  return normalizeWorkspace(workspace);
}

export async function extractProductTruth(productId: string) {
  const product = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      evidence: true,
      assets: true
    }
  });

  const titleEvidence = product.evidence.find((item) => item.kind === "page_title");
  const priceEvidence = product.evidence.find((item) => item.kind === "price");
  const purchaseEvidence = product.evidence.filter((item) => item.kind === "purchase_link");
  const factEvidence = product.evidence.filter((item) => ["spec", "text", "benefit"].includes(item.kind)).slice(0, 30);
  const usageEvidence = product.evidence.filter((item) => item.kind === "usage").slice(0, 8);
  const cautionEvidence = product.evidence.filter((item) => item.kind === "caution").slice(0, 8);

  const benefits = product.evidence
    .filter((item) => item.kind === "benefit" || /편리|간편|절약|깔끔|보호|도움|빠르/.test(item.text))
    .slice(0, 10)
    .map((item) => ({
      text: item.text,
      evidenceIds: [item.id],
      claimSafe: true
    }));

  const truth = ProductTruthSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    productName: product.productName || titleEvidence?.text || null,
    category: null,
    brand: null,
    price: {
      amount: priceEvidence ? extractPriceAmount(priceEvidence.text) : null,
      currency: "KRW",
      rawText: priceEvidence?.text ?? "",
      evidenceIds: priceEvidence ? [priceEvidence.id] : []
    },
    purchaseLinks: purchaseEvidence
      .filter((item) => item.url)
      .slice(0, 5)
      .map((item) => ({
        label: item.text,
        url: item.url!,
        evidenceIds: [item.id]
      })),
    facts: [
      ...factEvidence.map((item) => ({
        text: item.text,
        type: item.kind === "spec" ? ("spec" as const) : ("feature" as const),
        evidenceIds: [item.id]
      })),
      ...usageEvidence.map((item) => ({
        text: item.text,
        type: "usage" as const,
        evidenceIds: [item.id]
      })),
      ...cautionEvidence.map((item) => ({
        text: item.text,
        type: "caution" as const,
        evidenceIds: [item.id]
      }))
    ],
    benefits,
    usageSteps: usageEvidence.map((item, index) => ({
      step: index + 1,
      text: item.text,
      evidenceIds: [item.id]
    })),
    cautions: cautionEvidence.map((item) => ({
      text: item.text,
      severity: /위험|금지|화상|질식|어린이|의료/.test(item.text) ? ("high" as const) : ("low" as const),
      evidenceIds: [item.id]
    })),
    images: product.assets.map((asset) => ({
      assetId: asset.id,
      role: normalizeAssetRole(asset.role)
    })),
    allowedClaims: benefits.slice(0, 8).map((benefit, index) => ({
      text: benefit.text,
      claimType: index < 3 ? "benefit" : "feature",
      evidenceIds: benefit.evidenceIds,
      confidence: 0.78
    })),
    missingInfo: buildMissingInfo({
      hasPrice: Boolean(priceEvidence),
      hasPurchaseLink: purchaseEvidence.length > 0,
      hasUsage: usageEvidence.length > 0 || product.assets.some((asset) => asset.role === "usage"),
      hasImages: product.assets.length > 0
    })
  } satisfies ProductTruth);

  await prisma.productTruthSnapshot.create({
    data: {
      productId,
      schemaVersion: SCHEMA_VERSION,
      payload: toJsonString(truth)
    }
  });

  await prisma.claim.deleteMany({ where: { productId } });
  for (const claim of truth.allowedClaims) {
    await prisma.claim.create({
      data: {
        productId,
        text: claim.text,
        claimType: claim.claimType,
        confidence: claim.confidence,
        safe: true,
        evidence: {
          connect: claim.evidenceIds.map((id) => ({ id }))
        }
      }
    });
  }

  await prisma.productProject.update({
    where: { id: productId },
    data: {
      productName: truth.productName,
      category: truth.category,
      brand: truth.brand,
      status: "truth_extracted"
    }
  });

  return getProductWorkspace(productId);
}

function normalizeWorkspace(workspace: any) {
  return {
    ...workspace,
    sources: workspace.sources.map((source: any) => ({
      ...source,
      metadata: fromJsonString<Record<string, string>>(source.metadata, {})
    })),
    evidence: workspace.evidence.map((item: any) => ({
      ...item,
      metadata: fromJsonString<Record<string, unknown>>(item.metadata, {})
    })),
    truthSnapshots: workspace.truthSnapshots.map((snapshot: any) => ({
      ...snapshot,
      payload: fromJsonString(snapshot.payload, null)
    })),
    potential: workspace.potential
      ? {
          ...workspace.potential,
          breakdown: fromJsonString<Record<string, number>>(workspace.potential.breakdown, {}),
          penalties: fromJsonString<Record<string, number>>(workspace.potential.penalties, {})
        }
      : null,
    pains: workspace.pains.map((pain: any) => ({
      ...pain,
      evidenceIds: fromJsonString<string[]>(pain.evidenceIds, [])
    })),
    angles: workspace.angles.map((angle: any) => ({
      ...angle,
      requiredEvidenceIds: fromJsonString<string[]>(angle.requiredEvidenceIds, []),
      objectionToRemove: fromJsonString<string[]>(angle.objectionToRemove, []),
      riskFlags: fromJsonString<string[]>(angle.riskFlags, []),
      scoreBreakdown: fromJsonString<Record<string, number>>(angle.scoreBreakdown, {})
    })),
    hooks: workspace.hooks.map((hook: any) => ({
      ...hook,
      supportedClaimIds: fromJsonString<string[]>(hook.supportedClaimIds, []),
      riskFlags: fromJsonString<string[]>(hook.riskFlags, [])
    })),
    storyboards: workspace.storyboards.map((storyboard: any) => ({
      ...storyboard,
      payload: fromJsonString(storyboard.payload, null),
      cta: fromJsonString(storyboard.cta, null),
      missingShots: fromJsonString<string[]>(storyboard.missingShots, []),
      proofScenes: storyboard.proofScenes.map((scene: any) => ({
        ...scene,
        assetIds: fromJsonString<string[]>(scene.assetIds, []),
        evidenceIds: fromJsonString<string[]>(scene.evidenceIds, [])
      }))
    })),
    compliance: workspace.compliance.map((report: any) => ({
      ...report,
      unsupportedClaims: fromJsonString(report.unsupportedClaims, []),
      riskyClaims: fromJsonString(report.riskyClaims, []),
      missingEvidenceIds: fromJsonString<string[]>(report.missingEvidenceIds, []),
      requiredFixes: fromJsonString<string[]>(report.requiredFixes, [])
    })),
    packages: workspace.packages.map((item: any) => ({
      ...item,
      videoRenderIds: fromJsonString<string[]>(item.videoRenderIds, []),
      payload: fromJsonString(item.payload, null)
    })),
    improvements: workspace.improvements.map((item: any) => ({
      ...item,
      payload: fromJsonString(item.payload, null)
    })),
    promptRuns: workspace.promptRuns.map((item: any) => ({
      ...item,
      input: fromJsonString(item.input, null),
      output: fromJsonString(item.output, null)
    }))
  };
}

function normalizeAssetRole(role: string): AssetRole {
  if (["product", "usage", "before_after", "detail", "price", "caution", "unknown"].includes(role)) {
    return role as AssetRole;
  }
  return "unknown";
}

function buildMissingInfo(flags: {
  hasPrice: boolean;
  hasPurchaseLink: boolean;
  hasUsage: boolean;
  hasImages: boolean;
}): string[] {
  const missing: string[] = [];
  if (!flags.hasPrice) missing.push("가격 근거");
  if (!flags.hasPurchaseLink) missing.push("구매 링크");
  if (!flags.hasUsage) missing.push("실제 사용 장면 또는 사용 방법");
  if (!flags.hasImages) missing.push("상품 이미지");
  return missing;
}
