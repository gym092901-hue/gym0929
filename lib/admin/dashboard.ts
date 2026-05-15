import "server-only";

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  Json,
  PaymentProvider,
  PaymentStatus,
  PetType,
  ProductType,
  ReadingStatus,
} from "@/types/database";

export const adminPaymentStatuses = [
  "pending",
  "approved",
  "failed",
  "canceled",
] as const satisfies PaymentStatus[];

export type AdminDashboardFilters = {
  status?: PaymentStatus;
  readingId?: string;
  ownerEmail?: string;
};

export type AdminReadingListItem = {
  id: string;
  petName: string;
  petType: PetType | null;
  ownerEmail: string;
  status: ReadingStatus;
  hasPremiumReport: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentListItem = {
  id: string;
  readingId: string;
  provider: PaymentProvider;
  productType: ProductType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerOrderId: string | null;
  providerTid: string | null;
  providerPaymentId: string | null;
  rawResponse: Json | null;
  createdAt: string;
  updatedAt: string;
  petName: string;
  ownerEmail: string;
};

type ReadingQueryRow = {
  id: string;
  premium_report: string | null;
  status: ReadingStatus;
  created_at: string;
  updated_at: string;
  pets: {
    name: string;
    type: PetType;
    owner_email: string | null;
  } | null;
};

type PaymentQueryRow = {
  id: string;
  reading_id: string;
  provider: PaymentProvider;
  product_type: ProductType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_order_id: string | null;
  provider_tid: string | null;
  provider_payment_id: string | null;
  raw_response: Json | null;
  created_at: string;
  updated_at: string;
  readings: {
    id: string;
    pets: {
      name: string;
      owner_email: string | null;
    } | null;
  } | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    adminPaymentStatuses.includes(value as PaymentStatus)
  );
}

function normalizeSearch(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function findReadingIdsByOwnerEmail(ownerEmail: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("readings")
    .select("id, pets!inner(owner_email)")
    .ilike("pets.owner_email", `%${ownerEmail}%`)
    .limit(100);

  if (error || !data) {
    throw new Error("owner_email 검색 중 오류가 발생했습니다.");
  }

  return data.map((row) => row.id);
}

export async function getAdminDashboardData(filters: AdminDashboardFilters) {
  const readingId = normalizeSearch(filters.readingId);
  const ownerEmail = normalizeSearch(filters.ownerEmail);
  const readingIdIsSearchable = !readingId || uuidPattern.test(readingId);

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      readingIdIsSearchable,
      readings: [] as AdminReadingListItem[],
      payments: [] as AdminPaymentListItem[],
    };
  }

  if (!readingIdIsSearchable) {
    return {
      configured: true,
      readingIdIsSearchable,
      readings: [] as AdminReadingListItem[],
      payments: [] as AdminPaymentListItem[],
    };
  }

  const ownerReadingIds = ownerEmail
    ? await findReadingIdsByOwnerEmail(ownerEmail)
    : null;

  if (ownerReadingIds && ownerReadingIds.length === 0) {
    return {
      configured: true,
      readingIdIsSearchable,
      readings: [] as AdminReadingListItem[],
      payments: [] as AdminPaymentListItem[],
    };
  }

  const supabase = getSupabaseAdmin();
  let readingsQuery = supabase
    .from("readings")
    .select(
      "id, premium_report, status, created_at, updated_at, pets(name, type, owner_email)",
    );

  let paymentsQuery = supabase
    .from("payments")
    .select(
      "id, reading_id, provider, product_type, amount, currency, status, provider_order_id, provider_tid, provider_payment_id, raw_response, created_at, updated_at, readings(id, pets(name, owner_email))",
    );

  if (readingId) {
    readingsQuery = readingsQuery.eq("id", readingId);
    paymentsQuery = paymentsQuery.eq("reading_id", readingId);
  }

  if (ownerReadingIds) {
    readingsQuery = readingsQuery.in("id", ownerReadingIds);
    paymentsQuery = paymentsQuery.in("reading_id", ownerReadingIds);
  }

  if (filters.status) {
    paymentsQuery = paymentsQuery.eq("status", filters.status);
  }

  const [readingsResult, paymentsResult] = await Promise.all([
    readingsQuery
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<ReadingQueryRow[]>(),
    paymentsQuery
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<PaymentQueryRow[]>(),
  ]);

  const { data: readingsData, error: readingsError } = readingsResult;
  const { data: paymentsData, error: paymentsError } = paymentsResult;

  if (readingsError) {
    throw new Error("readings 목록을 불러오지 못했습니다.");
  }

  if (paymentsError) {
    throw new Error("payments 목록을 불러오지 못했습니다.");
  }

  return {
    configured: true,
    readingIdIsSearchable,
    readings: (readingsData ?? []).map((row) => ({
      id: row.id,
      petName: row.pets?.name ?? "-",
      petType: row.pets?.type ?? null,
      ownerEmail: row.pets?.owner_email ?? "-",
      status: row.status,
      hasPremiumReport: Boolean(row.premium_report),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    payments: (paymentsData ?? []).map((row) => ({
      id: row.id,
      readingId: row.reading_id,
      provider: row.provider,
      productType: row.product_type,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      providerOrderId: row.provider_order_id,
      providerTid: row.provider_tid,
      providerPaymentId: row.provider_payment_id,
      rawResponse: row.raw_response,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      petName: row.readings?.pets?.name ?? "-",
      ownerEmail: row.readings?.pets?.owner_email ?? "-",
    })),
  };
}
