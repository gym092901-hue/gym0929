import "server-only";
import type { PetLifestyleProfile } from "@/types/reading";

export const demoReadingId = "demo-mong-2026";

export const demoSamplePet = {
  name: "몽이",
  type: "dog" as const,
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
  ownerEmail: "test@example.com",
  lifestyle: {
    livingEnvironment: ["with_family", "mostly_indoor"],
    dailyActivityFrequency: "once",
    aloneTime: "one_to_three",
    strangerReaction: "observes_carefully",
    guardianDistance: "moderately_close",
    favoriteActivities: ["walk", "treat_search"],
    guardianQuestions: ["personality", "bond", "routine"],
  } satisfies PetLifestyleProfile,
};

export function isProductionRuntime() {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return process.env.NODE_ENV === "production";
}

export function isPublicReviewModeEnabled() {
  return process.env.PUBLIC_REVIEW_MODE === "true" && !isProductionRuntime();
}

export function isDemoModeEnabled() {
  return (
    (process.env.DEMO_MODE === "true" || isPublicReviewModeEnabled()) &&
    !isProductionRuntime()
  );
}

export function shouldShowHeaderTestLink() {
  return (
    !isProductionRuntime() &&
    (process.env.DEMO_MODE === "true" ||
      process.env.PUBLIC_REVIEW_MODE === "true" ||
      process.env.VERCEL_ENV !== "production")
  );
}

export function isDemoReadingId(readingId: string) {
  return readingId === demoReadingId;
}

export function getDemoDisabledResponse() {
  return {
    error:
      "무료 데모 모드는 로컬 개발 환경에서 DEMO_MODE=true일 때만 사용할 수 있습니다.",
  };
}
