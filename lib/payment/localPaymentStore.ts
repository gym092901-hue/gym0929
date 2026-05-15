import "server-only";

import { randomUUID } from "node:crypto";
import type { PaymentProvider, ProductType } from "@/types/database";

type LocalApprovedPayment = {
  id: string;
  readingId: string;
  provider: PaymentProvider;
  productType: ProductType;
  approvedAt: string;
};

type LocalPaymentStore = Map<string, LocalApprovedPayment>;

declare global {
  var __meongnyangLocalPayments: LocalPaymentStore | undefined;
}

function getStore() {
  globalThis.__meongnyangLocalPayments ??= new Map<string, LocalApprovedPayment>();
  return globalThis.__meongnyangLocalPayments;
}

function createKey(readingId: string, productType: ProductType) {
  return `${readingId}:${productType}`;
}

export function createLocalApprovedPayment(
  readingId: string,
  productType: ProductType,
) {
  const store = getStore();
  const key = createKey(readingId, productType);
  const existing = store.get(key);

  if (existing) {
    return existing;
  }

  const payment: LocalApprovedPayment = {
    id: `local-payment-${randomUUID()}`,
    readingId,
    provider: "mock",
    productType,
    approvedAt: new Date().toISOString(),
  };

  store.set(key, payment);

  return payment;
}

export function getLocalApprovedPayment(
  readingId: string,
  productType: ProductType,
) {
  return getStore().get(createKey(readingId, productType)) ?? null;
}

export function deleteLocalApprovedPayment(
  readingId: string,
  productType: ProductType,
) {
  return getStore().delete(createKey(readingId, productType));
}
