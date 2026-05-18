import { randomUUID } from "node:crypto";
import { isDemoModeEnabled, isProductionRuntime } from "@/lib/demo/config";
import {
  createFreeInsightSections,
  createFreeKeywords,
  createPremiumPreviewSections,
} from "@/lib/readings/content";
import { emptyLifestyleProfile } from "@/lib/readings/lifestyle";
import type { PetType } from "@/types/database";
import type { PetLifestyleProfile, Reading } from "@/types/reading";

type LocalReadingInput = {
  name: string;
  type: PetType;
  birthDate: string | null;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  adoptionDate: string | null;
  ownerEmail: string | null;
  freeSummary: string;
  lifestyle?: PetLifestyleProfile;
};

type LocalReadingStore = Map<string, Reading>;

declare global {
  var __meongnyangLocalReadings: LocalReadingStore | undefined;
}

function getStore() {
  globalThis.__meongnyangLocalReadings ??= new Map<string, Reading>();
  return globalThis.__meongnyangLocalReadings;
}

function canCreateLocalReading() {
  return process.env.NODE_ENV === "development" || isDemoModeEnabled();
}

export function createLocalReading(input: LocalReadingInput) {
  if (isProductionRuntime() || !canCreateLocalReading()) {
    throw new Error("운영 데이터베이스 설정이 필요합니다.");
  }

  const readingId = `local-${randomUUID()}`;
  const petId = `local-pet-${randomUUID()}`;
  const birthTime = input.birthTimeUnknown ? null : input.birthTime;
  const sectionInput = {
    name: input.name,
    type: input.type,
    birthDate: input.birthDate,
    birthTime,
    birthTimeUnknown: input.birthTimeUnknown,
    adoptionDate: input.adoptionDate,
    freeSummary: input.freeSummary,
    lifestyle: input.lifestyle ?? emptyLifestyleProfile,
  };

  const reading: Reading = {
    id: readingId,
    petName: input.name,
    species: input.type,
    birthDate: input.birthDate ?? "",
    birthTime,
    adoptionDate: input.adoptionDate ?? "",
    metDate: input.adoptionDate ?? input.birthDate ?? "",
    guardianEmail: input.ownerEmail ?? "",
    freeSummary: input.freeSummary,
    freeKeywords: createFreeKeywords(sectionInput),
    freeSections: createFreeInsightSections(sectionInput),
    premiumPreviewSections: createPremiumPreviewSections(sectionInput),
    lifestyle: input.lifestyle ?? emptyLifestyleProfile,
    premiumSections: [],
  };

  getStore().set(readingId, reading);

  return {
    petId,
    readingId,
    reading,
  };
}

export function getLocalReading(readingId: string) {
  return getStore().get(readingId) ?? null;
}

export function updateLocalReadingPremiumSections(
  readingId: string,
  premiumSections: Reading["premiumSections"],
) {
  const store = getStore();
  const reading = store.get(readingId);

  if (!reading) {
    return null;
  }

  const updatedReading = {
    ...reading,
    premiumSections,
  };

  store.set(readingId, updatedReading);

  return updatedReading;
}
