import { prisma } from "@/lib/prisma/client";
import { checkStoryboardCompliance } from "@/lib/compliance/rules";
import { buildHumanSafeVisualPlan } from "@/lib/generation/human-anatomy";
import { scoreHookCandidate } from "@/lib/scoring/hook-score";
import { scoreSalesAngle } from "@/lib/scoring/sales-angle-score";
import { scoreShortsSalesPotential } from "@/lib/scoring/sales-potential";
import type { HookPattern } from "@/lib/schemas/hook-candidate";
import type { ProductTruth } from "@/lib/schemas/product-truth";
import { ProductTruthSchema } from "@/lib/schemas/product-truth";
import type { Storyboard } from "@/lib/schemas/storyboard";
import { fromJsonString, toJsonString } from "@/lib/utils/json";
import { getProductWorkspace } from "./product-service";

export async function scoreProductPotential(productId: string) {
  const truth = await getLatestTruth(productId);
  const [evidenceCount, assetCount] = await Promise.all([
    prisma.evidenceItem.count({ where: { productId } }),
    prisma.sourceAsset.count({ where: { productId } })
  ]);
  const result = scoreShortsSalesPotential({ truth, evidenceCount, assetCount });
  await prisma.salesPotentialScore.upsert({
    where: { productId },
    update: {
      score: result.score,
      grade: result.grade,
      breakdown: toJsonString(result.breakdown),
      penalties: toJsonString(result.penalties),
      rationale: result.rationale
    },
    create: {
      productId,
      score: result.score,
      grade: result.grade,
      breakdown: toJsonString(result.breakdown),
      penalties: toJsonString(result.penalties),
      rationale: result.rationale
    }
  });
  await prisma.productProject.update({ where: { id: productId }, data: { status: "potential_scored" } });
  return getProductWorkspace(productId);
}

export async function generateSalesAngles(productId: string) {
  const truth = await getLatestTruth(productId);
  const claims = await prisma.claim.findMany({ where: { productId }, include: { evidence: true } });
  await prisma.storyboard.deleteMany({ where: { productId } });
  await prisma.hookCandidate.deleteMany({ where: { productId } });
  await prisma.salesAngle.deleteMany({ where: { productId } });
  await prisma.customerPain.deleteMany({ where: { productId } });

  const seeds = buildAngleSeeds(truth);
  if (seeds.length > 0) {
    await prisma.customerPain.createMany({
      data: seeds.slice(0, 8).map((seed) => ({
        productId,
        text: seed.customerPain,
        buyingMotive: seed.buyingMotive,
        situation: seed.targetCustomer,
        evidenceIds: toJsonString(seed.requiredEvidenceIds)
      }))
    });
  }

  for (const seed of seeds) {
    const scored = scoreSalesAngle({ ...seed, truth });
    if (scored.score < 50) continue;
    await prisma.salesAngle.create({
      data: {
        productId,
        angle: seed.angle,
        targetCustomer: seed.targetCustomer,
        customerPain: seed.customerPain,
        buyingMotive: seed.buyingMotive,
        corePromise: seed.corePromise,
        proofStrategy: seed.proofStrategy,
        requiredEvidenceIds: toJsonString(seed.requiredEvidenceIds),
        objectionToRemove: toJsonString(seed.objectionToRemove),
        riskFlags: toJsonString(scored.riskFlags),
        score: scored.score,
        scoreBreakdown: toJsonString(scored.scoreBreakdown)
      }
    });
  }

  if ((await prisma.salesAngle.count({ where: { productId } })) === 0 && claims[0]) {
    const claimEvidenceIds = claims[0].evidence.map((item) => item.id);
    const scored = scoreSalesAngle({
      truth,
      customerPain: "좋은 점이 많아도 실제로 내게 필요한지 빠르게 판단하기 어렵다",
      buyingMotive: "근거가 있는 장점만 짧게 확인하고 구매 여부를 결정하고 싶다",
      corePromise: claims[0].text,
      proofStrategy: "상품 이미지와 근거 문구를 순서대로 보여준다",
      requiredEvidenceIds: claimEvidenceIds,
      objectionToRemove: ["근거 없는 과장인지 걱정"],
      riskFlags: []
    });
    await prisma.salesAngle.create({
      data: {
        productId,
        angle: "근거가 있는 핵심 장점만 빠르게 보여주기",
        targetCustomer: "상품 정보를 길게 읽기 어려운 구매자",
        customerPain: "좋은 점이 많아도 실제로 내게 필요한지 빠르게 판단하기 어렵다",
        buyingMotive: "근거가 있는 장점만 짧게 확인하고 구매 여부를 결정하고 싶다",
        corePromise: claims[0].text,
        proofStrategy: "상품 이미지와 근거 문구를 순서대로 보여준다",
        requiredEvidenceIds: toJsonString(claimEvidenceIds),
        objectionToRemove: toJsonString(["근거 없는 과장인지 걱정"]),
        riskFlags: toJsonString(scored.riskFlags),
        score: scored.score,
        scoreBreakdown: toJsonString(scored.scoreBreakdown)
      }
    });
  }

  await prisma.productProject.update({ where: { id: productId }, data: { status: "angles_generated" } });
  return getProductWorkspace(productId);
}

export async function generateHooksForProduct(productId: string) {
  const angles = await prisma.salesAngle.findMany({
    where: { productId },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }]
  });
  await prisma.hookCandidate.deleteMany({ where: { productId } });
  for (const angle of angles.slice(0, 6)) {
    await createHooksForAngle(angle.id);
  }
  await prisma.productProject.update({ where: { id: productId }, data: { status: "hooks_generated" } });
  return getProductWorkspace(productId);
}

export async function generateHooksForAngle(angleId: string) {
  await createHooksForAngle(angleId, true);
  const angle = await prisma.salesAngle.findUniqueOrThrow({ where: { id: angleId } });
  return getProductWorkspace(angle.productId);
}

export async function generateStoryboards(productId: string) {
  const truth = await getLatestTruth(productId);
  const hooks = await prisma.hookCandidate.findMany({
    where: { productId, decision: { in: ["keep", "revise"] } },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 5,
    include: { angle: true }
  });
  const assets = await prisma.sourceAsset.findMany({ where: { productId } });
  const purchaseLinkId = truth.purchaseLinks[0]?.evidenceIds[0] ?? null;

  await prisma.videoRender.deleteMany({ where: { productId } });
  await prisma.storyboard.deleteMany({ where: { productId } });
  await prisma.shotRequest.deleteMany({ where: { productId } });
  await prisma.complianceReport.deleteMany({ where: { productId, targetType: "storyboard" } });

  const selectedHooks = hooks.length >= 3 ? hooks.slice(0, 5) : await ensureMinimumHooks(productId);
  const variants = ["A", "B", "C", "D", "E"];

  for (const [index, hook] of selectedHooks.slice(0, 5).entries()) {
    if (!hook.angle) continue;
    const usageAsset = assets.find((asset) => asset.role === "usage") ?? assets[0];
    const beforeAfterAsset = assets.find((asset) => asset.role === "before_after") ?? usageAsset;
    const evidenceIds = readJsonArray<string>(hook.angle.requiredEvidenceIds);
    const missingUsage = !usageAsset || usageAsset.role !== "usage";
    const durationSec = 27;
    const sceneCopy = buildStoryboardSceneCopy({
      truth,
      hookText: hook.text,
      angleCorePromise: hook.angle.corePromise,
      angleProofStrategy: hook.angle.proofStrategy,
      objections: readJsonArray<string>(hook.angle.objectionToRemove),
      variantIndex: index
    });
    const storyboard: Storyboard = {
      id: `storyboard_${hook.id}`,
      productId,
      angleId: hook.angle.id,
      hookId: hook.id,
      durationSec,
      aspectRatio: "9:16",
      renderVariant: variants[index] ?? String(index + 1),
      cta: {
        text: sceneCopy.ctaText,
        startsAtSec: durationSec - 5,
        purchaseLinkId
      },
      missingShots: missingUsage
        ? sceneCopy.missingShots
        : [],
      scenes: [
        {
          id: `scene_${hook.id}_1`,
          type: "problem",
          durationSec: 4,
          visualPlan: sceneCopy.problemVisualPlan,
          narration: sceneCopy.problemNarration,
          onScreenText: sceneCopy.problemText,
          assetIds: beforeAfterAsset ? [beforeAfterAsset.id] : [],
          evidenceIds,
          requiresUserShot: false
        },
        {
          id: `scene_${hook.id}_2`,
          type: "usage",
          durationSec: 8,
          visualPlan: buildHumanSafeVisualPlan(sceneCopy.usageVisualPlan),
          narration: sceneCopy.usageNarration,
          onScreenText: sceneCopy.usageText,
          assetIds: usageAsset ? [usageAsset.id] : [],
          evidenceIds,
          requiresUserShot: missingUsage,
          shotRequest: missingUsage ? sceneCopy.usageShotRequest : undefined
        },
        {
          id: `scene_${hook.id}_3`,
          type: "before_after",
          durationSec: 5,
          visualPlan: sceneCopy.compareVisualPlan,
          narration: sceneCopy.compareNarration,
          onScreenText: sceneCopy.compareText,
          assetIds: beforeAfterAsset ? [beforeAfterAsset.id] : [],
          evidenceIds,
          requiresUserShot: missingUsage,
          shotRequest: missingUsage ? sceneCopy.compareShotRequest : undefined
        },
        {
          id: `scene_${hook.id}_4`,
          type: "objection_removal",
          durationSec: 5,
          visualPlan: sceneCopy.objectionVisualPlan,
          narration: sceneCopy.objectionNarration,
          onScreenText: sceneCopy.objectionText,
          assetIds: assets.slice(0, 2).map((asset) => asset.id),
          evidenceIds,
          requiresUserShot: false
        },
        {
          id: `scene_${hook.id}_5`,
          type: "cta",
          durationSec: 5,
          visualPlan: sceneCopy.ctaVisualPlan,
          narration: sceneCopy.ctaNarration,
          onScreenText: sceneCopy.ctaText,
          assetIds: assets.slice(0, 1).map((asset) => asset.id),
          evidenceIds: truth.purchaseLinks[0]?.evidenceIds ?? [],
          requiresUserShot: false
        }
      ]
    };
    const compliance = checkStoryboardCompliance(
      { productId, targetType: "storyboard", targetId: storyboard.id },
      storyboard,
      truth
    );

    const created = await prisma.storyboard.create({
      data: {
        id: storyboard.id,
        productId,
        angleId: storyboard.angleId,
        hookId: storyboard.hookId,
        durationSec: storyboard.durationSec,
        aspectRatio: storyboard.aspectRatio,
        payload: toJsonString(storyboard),
        cta: toJsonString(storyboard.cta),
        missingShots: toJsonString(storyboard.missingShots),
        renderVariant: storyboard.renderVariant,
        complianceReportId: compliance.id,
        proofScenes: {
          create: storyboard.scenes.map((scene, orderIndex) => ({
            type: scene.type,
            orderIndex,
            durationSec: scene.durationSec,
            visualPlan: scene.visualPlan,
            narration: scene.narration,
            onScreenText: scene.onScreenText,
            assetIds: toJsonString(scene.assetIds),
            evidenceIds: toJsonString(scene.evidenceIds),
            requiresUserShot: scene.requiresUserShot,
            shotRequest: scene.shotRequest
          }))
        }
      }
    });

    await prisma.complianceReport.create({
      data: {
        id: compliance.id,
        productId,
        targetType: compliance.targetType,
        targetId: created.id,
        verdict: compliance.verdict,
        unsupportedClaims: toJsonString(compliance.unsupportedClaims),
        riskyClaims: toJsonString(compliance.riskyClaims),
        fakeReviewDetected: compliance.fakeReviewDetected,
        productNameInFirstTwoSeconds: compliance.productNameInFirstTwoSeconds,
        ctaBeforeLastFiveSeconds: compliance.ctaBeforeLastFiveSeconds,
        missingEvidenceIds: toJsonString(compliance.missingEvidenceIds),
        requiredFixes: toJsonString(compliance.requiredFixes)
      }
    });

    for (const missingShot of storyboard.missingShots) {
      await prisma.shotRequest.create({
        data: {
          productId,
          storyboardId: created.id,
          description: missingShot,
          reason: "상품 사용 장면 자료가 부족해 로컬 사용 컷 또는 직접 촬영 컷이 필요합니다."
        }
      });
    }
  }

  await prisma.productProject.update({ where: { id: productId }, data: { status: "storyboards_generated" } });
  return getProductWorkspace(productId);
}

function buildStoryboardSceneCopy(input: {
  truth: ProductTruth;
  hookText: string;
  angleCorePromise: string;
  angleProofStrategy: string;
  objections: string[];
  variantIndex: number;
}) {
  const productName = cleanPublicCopy(input.truth.productName ?? "상품");
  const usageStep = pickMeaningfulByIndex(
    input.truth.usageSteps.map((step) => step.text),
    input.variantIndex
  );
  let safeClaim = pickMeaningfulByIndex(
    [
      ...input.truth.allowedClaims.map((claim) => claim.text),
      ...input.truth.benefits.map((benefit) => benefit.text),
      ...input.truth.facts.filter((fact) => fact.type === "feature" || fact.type === "usage").map((fact) => fact.text)
    ],
    input.variantIndex
  );
  if (safeClaim && isFoamRollerProduct(productName, input.truth.category) && !isFoamRollerRelevantCopy(safeClaim)) {
    safeClaim = undefined;
  }
  const caution = pickMeaningfulByIndex(input.truth.cautions.map((item) => item.text), input.variantIndex);
  const usageFallback = buildUsageFallback(input.truth, input.variantIndex);
  const compareFallback = buildFeatureFallback(input.truth, input.variantIndex);
  const cautionFallback = buildCautionFallback(input.truth, input.variantIndex);
  const problemText = cleanPublicCopy(input.hookText, "운동 전 준비가 번거롭다면 이 장면부터 보세요");
  const usageNarration = cleanPublicCopy(usageStep, usageFallback);
  const usageText = shortCopy(usageStep, usageFallback, 22);
  const compareNarration = cleanPublicCopy(
    safeClaim ?? input.angleCorePromise,
    compareFallback
  );
  const compareText = shortCopy(safeClaim ?? usageStep, compareFallback, 22);
  const objectionNarration = cleanPublicCopy(
    caution ?? input.objections[0],
    cautionFallback
  );
  const objectionText = shortCopy(caution ?? input.objections[0], cautionFallback, 22);
  const rawPrice = input.truth.price.rawText;
  const priceOrOption = /불명|없음|미확인/i.test(rawPrice) ? "" : cleanPublicCopy(rawPrice, "");
  const ctaText = priceOrOption ? `구성 확인 · ${shortCopy(priceOrOption, "옵션 확인", 16)}` : `${shortCopy(productName, "상품", 16)} 옵션 확인`;

  return {
    ctaText,
    problemText,
    problemNarration: problemText,
    problemVisualPlan: "상품명이 아니라 운동 전 준비 상황과 사용 이유를 먼저 보여주고 후킹 문장을 크게 배치",
    usageText,
    usageNarration,
    usageVisualPlan: `${productName}를 한국인 성인 남성 또는 여성이 자연스럽게 사용하는 장면. ${usageNarration}`,
    compareText,
    compareNarration,
    compareVisualPlan: "제품 사진, 구성 포인트, 실제 사용 순서를 이어 붙여 구매 판단에 필요한 근거를 제시",
    objectionText,
    objectionNarration,
    objectionVisualPlan: "구성, 사용법, 주의사항 중 구매 전 확인해야 할 정보를 짧게 제시",
    ctaNarration: priceOrOption
      ? `${productName} 구성과 ${priceOrOption} 정보를 확인하고 필요한 옵션을 선택하세요.`
      : `${productName} 구성과 옵션을 확인하고 필요한 경우 구매 링크로 이동하세요.`,
    ctaVisualPlan: "상품 이미지와 구매 링크 안내를 마지막 5초에만 노출",
    usageShotRequest: `${productName}를 사용하는 3~5초 세로 영상. 신체 접촉점과 제품이 함께 보이게 촬영`,
    compareShotRequest: `${productName}의 구성, 사용 위치, 사용 순서를 비교할 수 있는 세로 컷`,
    missingShots: [
      `${productName}를 실제 사용하는 손/상황 컷 1개`,
      `${productName} 사용 위치와 구성 포인트가 보이는 컷 1개`
    ]
  };
}

export async function createConversionPackage(productId: string) {
  const product = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      renders: true,
      storyboards: { include: { hook: true, angle: true } },
      truthSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  const truth = ProductTruthSchema.parse(fromJsonString(product.truthSnapshots[0]?.payload, null));
  const completeRenders = product.renders.filter((render) => render.status === "complete");
  const renderIds =
    completeRenders.length > 0 ? completeRenders.map((render) => render.id) : product.storyboards.map((item) => item.id);
  const hashtags = ["#쇼츠", "#상품추천", truth.category ? `#${truth.category.replace(/\s+/g, "")}` : "#구매전확인"].slice(0, 5);
  const payload = {
    id: `package_${productId}`,
    productId,
    videoRenderIds: renderIds.slice(0, 5),
    titles: renderIds.slice(0, 5).map((id, index) => ({
      videoRenderId: id,
      text: `${product.storyboards[index]?.hook?.text ?? "구매 전 확인할 포인트"} | ${truth.productName ?? "상품"}`,
      score: Math.max(70, 92 - index * 4)
    })),
    descriptions: renderIds.slice(0, 5).map((id) => ({
      videoRenderId: id,
      text: [
        `${truth.productName ?? "상품"} 상품 정보와 참고 자료를 바탕으로 만든 쇼츠입니다.`,
        "구성, 옵션, 주의사항은 구매 전 상품 정보에서 다시 확인하세요.",
        truth.purchaseLinks[0]?.url ? `구매 링크: ${truth.purchaseLinks[0].url}` : "구매 링크는 상품 정보에서 확인하세요."
      ].join("\n")
    })),
    pinnedComments: renderIds.slice(0, 5).map((id) => ({
      videoRenderId: id,
      text: truth.purchaseLinks[0]?.url
        ? `옵션/가격은 여기서 확인하세요: ${truth.purchaseLinks[0].url}`
        : "옵션과 구성은 상품 정보에서 직접 확인하세요."
    })),
    hashtags,
    productTagPriority: truth.purchaseLinks.map((link, index) => ({
      label: link.label,
      url: link.url,
      priority: index + 1,
      reason: index === 0 ? "가장 직접적인 구매 링크" : "보조 구매 링크"
    })),
    manualUploadChecklist: [
      "영상 첫 2초가 상품명이 아닌 문제/결과/사용 장면으로 시작하는지 확인",
      "상품 정보에 없는 효능/성능 주장이 없는지 확인",
      "가짜 리뷰처럼 보이는 문구가 없는지 확인",
      "CTA가 마지막 5초에만 나오는지 확인",
      "가격과 옵션이 현재 상품 정보와 일치하는지 확인",
      "사람이 최종 미리보기 후 다운로드"
    ],
    performanceInputTemplate: ["조회수", "평균 시청 지속 시간", "유지율", "클릭률", "구매 수", "댓글 반응", "메모"]
  };

  await prisma.conversionPackage.create({
    data: {
      productId,
      videoRenderIds: toJsonString(payload.videoRenderIds),
      payload: toJsonString(payload)
    }
  });
  await prisma.productProject.update({ where: { id: productId }, data: { status: "conversion_packaged" } });
  return getProductWorkspace(productId);
}

export async function recordPerformanceAndCreateImprovement(
  productId: string,
  input: {
    videoRenderId?: string;
    views?: number;
    avgViewDuration?: number;
    retentionRate?: number;
    clickThroughRate?: number;
    purchases?: number;
    comments?: number;
    notes?: string;
  }
) {
  const performance = await prisma.performanceRecord.create({
    data: {
      productId,
      videoRenderId: input.videoRenderId,
      views: input.views,
      avgViewDuration: input.avgViewDuration,
      retentionRate: input.retentionRate,
      clickThroughRate: input.clickThroughRate,
      purchases: input.purchases,
      comments: input.comments,
      notes: input.notes
    }
  });

  const improvement = {
    summary: "성과 데이터 기반 다음 영상 개선안",
    recommendations: buildImprovementRecommendations(input),
    nextTests: [
      "첫 2초 후킹을 문제형과 전후 비교형으로 A/B 테스트",
      "사용 장면을 더 가까운 컷으로 교체",
      "CTA 문구를 가격 확인보다 옵션 확인 중심으로 바꿔 테스트"
    ]
  };

  await prisma.improvementPlan.create({
    data: {
      productId,
      performanceId: performance.id,
      payload: toJsonString(improvement)
    }
  });
  return getProductWorkspace(productId);
}

async function createHooksForAngle(angleId: string, clearExisting = false) {
  const angle = await prisma.salesAngle.findUniqueOrThrow({ where: { id: angleId } });
  const truth = await getLatestTruth(angle.productId);
  const claims = await prisma.claim.findMany({ where: { productId: angle.productId } });
  if (clearExisting) {
    await prisma.hookCandidate.deleteMany({ where: { angleId } });
  }
  const evidenceIds = readJsonArray<string>(angle.requiredEvidenceIds);
  const supportedClaimIds = claims
    .filter((claim) => evidenceIds.length > 0 || claim.safe)
    .slice(0, 3)
    .map((claim) => claim.id);
  const fallbackClaimIds = supportedClaimIds.length > 0 ? supportedClaimIds : claims.slice(0, 1).map((claim) => claim.id);
  const candidates = buildHookTexts(angle.customerPain, angle.corePromise, angle.buyingMotive);
  const unique = [...new Set(candidates)].slice(0, clearExisting ? 30 : 6);
  for (const [index, text] of unique.entries()) {
    const scored = scoreHookCandidate(text, truth, fallbackClaimIds);
    await prisma.hookCandidate.create({
      data: {
        productId: angle.productId,
        angleId: angle.id,
        text,
        pattern: inferHookPattern(text),
        startsWithProductName: scored.startsWithProductName,
        supportedClaimIds: toJsonString(fallbackClaimIds),
        riskFlags: toJsonString(scored.riskFlags),
        score: scored.score,
        decision: scored.decision,
        rejectionReason: scored.rejectionReason
      }
    });
    if (!clearExisting && index >= 4) break;
  }
}

async function ensureMinimumHooks(productId: string) {
  let hooks = await prisma.hookCandidate.findMany({
    where: { productId },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 5,
    include: { angle: true }
  });
  if (hooks.length >= 3) return hooks;
  await generateHooksForProduct(productId);
  hooks = await prisma.hookCandidate.findMany({
    where: { productId },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 5,
    include: { angle: true }
  });
  return hooks;
}

async function getLatestTruth(productId: string): Promise<ProductTruth> {
  const snapshot = await prisma.productTruthSnapshot.findFirst({
    where: { productId },
    orderBy: { createdAt: "desc" }
  });
  if (!snapshot) {
    throw new Error("ProductTruth가 아직 생성되지 않았습니다.");
  }
  return ProductTruthSchema.parse(fromJsonString(snapshot.payload, null));
}

function buildAngleSeeds(truth: ProductTruth) {
  const evidenceIds = [
    ...truth.allowedClaims.flatMap((claim) => claim.evidenceIds),
    ...truth.usageSteps.flatMap((step) => step.evidenceIds)
  ].slice(0, 8);
  const productLabel = cleanPublicCopy(truth.productName ?? "이 상품");
  let firstBenefit =
    pickMeaningfulByIndex(
      [...truth.allowedClaims.map((claim) => claim.text), ...truth.benefits.map((benefit) => benefit.text)],
      0
    ) ?? buildFeatureFallback(truth, 0);
  if (isFoamRollerProduct(productLabel, truth.category) && !isFoamRollerRelevantCopy(firstBenefit)) {
    firstBenefit = buildFeatureFallback(truth, 0);
  }
  const usageProof = pickMeaningfulByIndex(truth.usageSteps.map((step) => step.text), 0) ?? buildUsageFallback(truth, 0);

  return [
    {
      angle: "구매 전 불편을 먼저 짚고 사용 장면으로 해소",
      targetCustomer: "상품이 필요한 상황은 있지만 구매 확신이 부족한 고객",
      customerPain: "지금 상황에 맞는 상품인지 설명을 오래 읽어야 한다",
      buyingMotive: "내 상황에 바로 쓸 수 있다는 확신을 얻고 싶다",
      corePromise: firstBenefit,
      proofStrategy: usageProof,
      requiredEvidenceIds: evidenceIds,
      objectionToRemove: ["정말 내 상황에 필요한지", "사용법이 복잡하지 않은지"],
      riskFlags: []
    },
    {
      angle: "사용 장면 중심 비교",
      targetCustomer: "구매 전 결과를 먼저 보고 싶은 고객",
      customerPain: "설명보다 실제 사용 장면을 봐야 구매 판단이 된다",
      buyingMotive: "사용 장면과 구성 포인트가 명확하면 빠르게 구매를 결정할 수 있다",
      corePromise: firstBenefit,
      proofStrategy: "운동 전 준비 상황과 실제 사용 순서를 나란히 보여준다",
      requiredEvidenceIds: evidenceIds,
      objectionToRemove: ["사용 장면이 내 상황과 맞는지"],
      riskFlags: []
    },
    {
      angle: "실수 회피형",
      targetCustomer: "처음 구매하거나 비슷한 상품을 비교 중인 고객",
      customerPain: "비슷한 상품이 많아 무엇을 확인해야 하는지 모르겠다",
      buyingMotive: "구매 전 놓치면 안 되는 기준을 알고 싶다",
      corePromise: `${productLabel} 구매 전 확인할 근거`,
      proofStrategy: "구성, 사용법, 주의사항을 짧게 정리한다",
      requiredEvidenceIds: evidenceIds,
      objectionToRemove: ["옵션 선택 실수", "주의사항 미확인"],
      riskFlags: []
    },
    {
      angle: "사용법 간단함 강조",
      targetCustomer: "복잡한 제품 설명을 싫어하는 고객",
      customerPain: "좋아 보여도 사용법이 번거로우면 사기 망설여진다",
      buyingMotive: "사용 순서가 단순하다는 걸 확인하고 싶다",
      corePromise: usageProof,
      proofStrategy: "사용 순서를 3컷 안에서 보여준다",
      requiredEvidenceIds: evidenceIds,
      objectionToRemove: ["사용법이 복잡할 것 같다는 걱정"],
      riskFlags: []
    },
    {
      angle: "구매 장벽 제거형",
      targetCustomer: "장바구니에 넣기 전 마지막 확인이 필요한 고객",
      customerPain: "가격, 구성, 주의사항을 한 번 더 확인해야 안심된다",
      buyingMotive: "구매 전 필요한 정보를 빠르게 확인하고 싶다",
      corePromise: firstBenefit,
      proofStrategy: "구성, 구매 링크, 주의사항을 마지막 CTA 전에 정리한다",
      requiredEvidenceIds: evidenceIds,
      objectionToRemove: ["구성 확인 필요", "옵션 확인 필요", "주의사항 확인 필요"],
      riskFlags: []
    }
  ];
}

function buildHookTexts(customerPain: string, corePromise: string, buyingMotive: string): string[] {
  const shortPain = trimSentence(customerPain, 28);
  const shortPromise = trimSentence(corePromise, 30);
  const shortMotive = trimSentence(buyingMotive, 28);
  return [
    "이 불편함, 설명보다 먼저 장면으로 보세요",
    "구매 전 이 장면부터 확인하세요",
    "왜 계속 불편했는지 여기서 갈립니다",
    "사용 장면을 먼저 보고 판단하세요",
    "이걸 놓치면 옵션 선택이 헷갈립니다",
    `${shortPain}면 먼저 보세요`,
    `${shortPromise}가 핵심이면 이 장면입니다`,
    "상품 정보에서 이 부분만 먼저 확인하세요",
    "사기 전에 사용 장면부터 보세요",
    "좋아 보여도 이 기준은 확인해야 합니다",
    "결제 전 마지막으로 볼 장면입니다",
    "비슷한 상품 사이에서 이 차이를 보세요",
    "설명 말고 실제 쓰는 순서부터 봅니다",
    "이런 상황이면 구매 이유가 분명해집니다",
    `${shortMotive}면 이 포인트를 보세요`,
    "가격 보기 전에 이 장면부터 확인하세요",
    "사용 장면이 애매하면 이 부분을 보세요",
    "구매 망설이는 이유, 여기서 줄어듭니다",
    "긴 설명 대신 이 순서로 보세요",
    "이 실수만 피하면 선택이 쉬워집니다",
    "문제 장면부터 보면 필요한지 바로 압니다",
    "먼저 불편함을 보고, 그다음 사용 장면입니다",
    "옵션보다 먼저 확인할 건 사용 증거입니다",
    "이 차이가 보이면 장바구니 고민이 줄어요",
    "사진만 보고 넘기면 놓치는 포인트입니다",
    "처음 사는 사람은 이 장면부터 보세요",
    "구매 전 체크할 장면만 모았습니다",
    "결과보다 먼저 원인을 봐야 합니다",
    "이 상황이면 상품 정보를 다시 보게 됩니다",
    "마지막 5초 전에 판단 근거를 보여드릴게요"
  ];
}

function inferHookPattern(text: string): HookPattern {
  if (/전후|차이|비교/.test(text)) return "before_after";
  if (/실수|놓치|피하/.test(text)) return "mistake";
  if (/왜|의외|이유/.test(text)) return "surprise";
  if (/구매 전|결제 전|사기 전/.test(text)) return "avoidance";
  if (/장면|먼저|보세요/.test(text)) return "problem";
  return "result";
}

function pickByIndex<T>(values: Array<T | null | undefined>, index: number): T | undefined {
  const cleanValues = values.filter((value): value is T => value !== null && value !== undefined && String(value).trim().length > 0);
  if (cleanValues.length === 0) return undefined;
  return cleanValues[index % cleanValues.length];
}

function pickMeaningfulByIndex(values: Array<string | null | undefined>, index: number): string | undefined {
  return pickByIndex(
    values.map((value) => cleanPublicCopy(value ?? "")).filter((value) => value && !isLowSignalCopy(value)),
    index
  );
}

function shortCopy(value: string | null | undefined, fallback: string, maxLength: number): string {
  const clean = cleanPublicCopy(value ?? "", fallback);
  const chars = [...clean];
  if (chars.length <= maxLength) return clean;
  return `${chars.slice(0, Math.max(1, maxLength - 3)).join("")}...`;
}

function cleanPublicCopy(value: string | null | undefined, fallback = ""): string {
  const clean = String(value ?? "")
    .replace(/상세\s*본문/g, "상품 설명")
    .replace(/상세\s*페이지|상세페이지/g, "상품 정보")
    .replace(/가격\s*불명확|가격\s*불명|가격\s*미확인|가격 정보 없음/g, "구성 확인")
    .replace(/불명확|불명|미확인/g, "확인 필요")
    .replace(/먼저 쓰는 장면부터 확인/g, "사용 장면부터 확인")
    .replace(/구매 전 확인할 점/g, "구성·사용법·주의사항")
    .replace(/옵션과 가격은 상품 정보에서 확인/g, "구성·옵션 확인")
    .replace(/사용 후 기대 변화|달라진 지점|전후 차이/g, "사용 장면")
    .replace(/통증|아픔/g, "운동 전 뻐근함")
    .replace(/치료|재활|완치|교정|완화|회복|개선/g, "사용")
    .replace(/\s+/g, " ")
    .trim();
  if (isLowSignalCopy(clean)) return fallback;
  return clean || fallback;
}

function isLowSignalCopy(value: string): boolean {
  return /^(naver|네이버)\.?$/i.test(value.trim()) || /직접\s*확인하지\s*못|자동\s*수집|웹검색|같은 상품 후보|수집이 막|원본 상품|페이지 차단|본문 확인|네이버\s*검색|검색\s*결과|상품\s*\d{5,}|메뉴\s*영역|본문\s*바로가기|바로가기|상품 정보에 제시된 장점|구성 확인 필요|옵션 확인 필요|주의사항 확인 필요/i.test(value);
}

function buildUsageFallback(truth: ProductTruth, index: number): string {
  const productName = cleanPublicCopy(truth.productName ?? "상품", "상품");
  if (isFoamRollerProduct(productName, truth.category)) {
    return [
      "등 아래에 두고 천천히 굴리는 사용 장면입니다.",
      "종아리 아래에 두고 앞뒤로 움직이는 사용 장면입니다.",
      "허벅지 아래에 대고 압력을 조절하는 사용 장면입니다.",
      "운동 전후 루틴에 짧게 더하는 사용 장면입니다."
    ][index % 4];
  }
  return `${productName}를 실제 사용하는 장면을 확인하세요.`;
}

function buildFeatureFallback(truth: ProductTruth, index: number): string {
  const productName = cleanPublicCopy(truth.productName ?? "상품", "상품");
  if (isFoamRollerProduct(productName, truth.category)) {
    return [
      "등·종아리·허벅지에 대고 굴리는 사용 예시입니다.",
      "운동 전후에 짧게 따라 하기 쉬운 사용 예시입니다.",
      "제품과 신체 접촉점을 함께 보여주는 사용 예시입니다."
    ][index % 3];
  }
  return `${productName}의 구성과 사용 포인트를 확인하세요.`;
}

function buildCautionFallback(truth: ProductTruth, index: number): string {
  const productName = cleanPublicCopy(truth.productName ?? "상품", "상품");
  if (isFoamRollerProduct(productName, truth.category)) {
    return [
      "목과 관절을 직접 누르지 말고 천천히 사용하세요.",
      "처음에는 짧게 움직이며 압력을 조절하세요.",
      "불편하면 멈추고 사용 위치를 바꿔 확인하세요."
    ][index % 3];
  }
  return `${productName} 사용법과 주의사항을 확인하세요.`;
}

function isFoamRollerProduct(productName: string, category?: string | null): boolean {
  return /폼\s*롤러|폼롤러|foam\s*roller/i.test(`${productName} ${category ?? ""}`);
}

function isFoamRollerRelevantCopy(value: string): boolean {
  return /폼\s*롤러|폼롤러|foam\s*roller|운동|스트레칭|등|허리|종아리|허벅지|다리|롤링|굴리|사용|요가|필라테스/i.test(value);
}

function trimSentence(value: string, max: number): string {
  const compact = cleanPublicCopy(value).replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}...`;
}

function readJsonArray<T>(value: unknown): T[] {
  return fromJsonString<T[]>(value, []);
}

function buildImprovementRecommendations(input: {
  views?: number;
  retentionRate?: number;
  clickThroughRate?: number;
  purchases?: number;
}) {
  const recommendations: string[] = [];
  if ((input.retentionRate ?? 0) < 35) {
    recommendations.push("첫 2초 후킹을 더 짧게 만들고 문제 장면을 첫 프레임에 배치");
  }
  if ((input.clickThroughRate ?? 0) < 1) {
    recommendations.push("CTA에서 가격 확인보다 옵션/구성 확인 이유를 더 명확히 제시");
  }
  if ((input.purchases ?? 0) === 0 && (input.views ?? 0) > 1000) {
    recommendations.push("사용 장면과 전후 비교 장면을 추가 촬영해 구매 확신 강화");
  }
  if (recommendations.length === 0) {
    recommendations.push("성과가 나쁘지 않으므로 상위 후킹 패턴을 유지하고 첫 장면만 변형 테스트");
  }
  return recommendations;
}
