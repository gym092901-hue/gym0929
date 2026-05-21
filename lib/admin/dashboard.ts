import "server-only";

import { isDemoModeEnabled } from "@/lib/demo/config";
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
  "ready",
  "pending",
  "approved",
  "failed",
  "canceled",
  "refunded",
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
  premiumPaymentApproved: boolean;
  legacyPdfPaymentApproved: boolean;
  pdfDownloadAllowed: boolean;
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

export type AdminFeedbackListItem = {
  id: string;
  testerName: string;
  contact: string;
  petType: PetType | null;
  page: string;
  rating: number;
  message: string;
  createdAt: string;
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

type PaymentAccessQueryRow = {
  reading_id: string;
  provider: PaymentProvider;
  product_type: ProductType;
  status: PaymentStatus;
};

type FeedbackQueryRow = {
  id: string;
  tester_name: string | null;
  contact: string | null;
  pet_type: PetType | null;
  page: string;
  rating: number;
  message: string;
  created_at: string;
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
      feedbacks: [] as AdminFeedbackListItem[],
    };
  }

  if (!readingIdIsSearchable) {
    return {
      configured: true,
      readingIdIsSearchable,
      readings: [] as AdminReadingListItem[],
      payments: [] as AdminPaymentListItem[],
      feedbacks: [] as AdminFeedbackListItem[],
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
      feedbacks: [] as AdminFeedbackListItem[],
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
  const feedbacksQuery = supabase
    .from("feedbacks")
    .select("id, tester_name, contact, pet_type, page, rating, message, created_at")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<FeedbackQueryRow[]>();

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

  const [readingsResult, paymentsResult, feedbacksResult] = await Promise.all([
    readingsQuery
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<ReadingQueryRow[]>(),
    paymentsQuery
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<PaymentQueryRow[]>(),
    feedbacksQuery,
  ]);

  const { data: readingsData, error: readingsError } = readingsResult;
  const { data: paymentsData, error: paymentsError } = paymentsResult;
  const { data: feedbacksData, error: feedbacksError } = feedbacksResult;

  if (readingsError) {
    throw new Error("readings 목록을 불러오지 못했습니다.");
  }

  if (paymentsError) {
    throw new Error("payments 목록을 불러오지 못했습니다.");
  }

  if (feedbacksError) {
    throw new Error("feedbacks 목록을 불러오지 못했습니다.");
  }

  const readingRows = readingsData ?? [];
  const readingIds = readingRows.map((row) => row.id);
  const paymentAccessByReadingId = new Map<
    string,
    {
      premiumReportApproved: boolean;
      legacyPdfReportApproved: boolean;
    }
  >();

  if (readingIds.length > 0) {
    const { data: accessData, error: accessError } = await supabase
      .from("payments")
      .select("reading_id, provider, product_type, status")
      .in("reading_id", readingIds)
      .in("product_type", ["premium_report", "pdf_report"])
      .eq("status", "approved")
      .returns<PaymentAccessQueryRow[]>();

    if (accessError) {
      throw new Error("PDF 권한 상태를 불러오지 못했습니다.");
    }

    const demoModeEnabled = isDemoModeEnabled();

    for (const row of accessData ?? []) {
      const providerIsAllowed = row.provider !== "mock" || demoModeEnabled;

      if (!providerIsAllowed) {
        continue;
      }

      const current = paymentAccessByReadingId.get(row.reading_id) ?? {
        premiumReportApproved: false,
        legacyPdfReportApproved: false,
      };

      if (row.product_type === "premium_report") {
        current.premiumReportApproved = true;
      }

      if (row.product_type === "pdf_report") {
        current.legacyPdfReportApproved = true;
      }

      paymentAccessByReadingId.set(row.reading_id, current);
    }
  }

  return {
    configured: true,
    readingIdIsSearchable,
    readings: readingRows.map((row) => {
      const paymentAccess = paymentAccessByReadingId.get(row.id);
      const premiumPaymentApproved = Boolean(
        paymentAccess?.premiumReportApproved,
      );

      return {
        id: row.id,
        petName: row.pets?.name ?? "-",
        petType: row.pets?.type ?? null,
        ownerEmail: row.pets?.owner_email ?? "-",
        status: row.status,
        hasPremiumReport: Boolean(row.premium_report),
        premiumPaymentApproved,
        legacyPdfPaymentApproved: Boolean(
          paymentAccess?.legacyPdfReportApproved,
        ),
        pdfDownloadAllowed: premiumPaymentApproved,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),
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
    feedbacks: (feedbacksData ?? []).map((row) => ({
      id: row.id,
      testerName: row.tester_name ?? "-",
      contact: row.contact ?? "-",
      petType: row.pet_type,
      page: row.page,
      rating: row.rating,
      message: row.message,
      createdAt: row.created_at,
    })),
  };
}
