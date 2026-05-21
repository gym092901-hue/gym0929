import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import {
  loginAdminAction,
  logoutAdminAction,
  recheckFailedPaymentAction,
  regeneratePremiumReportAction,
} from "@/app/admin/actions";
import {
  adminPaymentStatuses,
  getAdminDashboardData,
  isPaymentStatus,
  type AdminFeedbackListItem,
  type AdminPaymentListItem,
  type AdminReadingListItem,
} from "@/lib/admin/dashboard";
import { hasAdminSession, isAdminPasswordConfigured } from "@/lib/admin/auth";
import { getProductCatalogItem } from "@/lib/products/catalog";
import type { PaymentStatus } from "@/types/database";

type AdminPageProps = {
  searchParams: Promise<{
    status?: string;
    readingId?: string;
    ownerEmail?: string;
    error?: string;
    message?: string;
  }>;
};

export const metadata = {
  title: "멍냥사주 관리자",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const errorMessages: Record<string, string> = {
  invalid_password: "비밀번호가 올바르지 않습니다.",
  session_required: "관리자 로그인이 필요합니다.",
  payment_recheck_failed: "실패 결제 재확인 기록을 저장하지 못했습니다.",
  premium_report_regenerate_failed: "유료 리포트를 다시 생성하지 못했습니다.",
};

const successMessages: Record<string, string> = {
  payment_rechecked: "실패 결제 재확인 기록을 원본 응답에 저장했습니다.",
  premium_report_regenerated: "유료 리포트를 다시 생성했습니다.",
};

const statusClass: Record<PaymentStatus, string> = {
  ready: "bg-persimmon/10 text-persimmon",
  pending: "bg-persimmon/10 text-persimmon",
  approved: "bg-moss/10 text-moss",
  failed: "bg-berry/10 text-berry",
  canceled: "bg-ink/10 text-ink/65",
  refunded: "bg-moss/10 text-moss",
};

const paymentStatusText: Record<PaymentStatus, string> = {
  ready: "결제 준비",
  pending: "결제 대기",
  approved: "결제 승인",
  failed: "결제 실패",
  canceled: "결제 취소",
  refunded: "환불 완료",
};

const readingStatusText: Record<string, string> = {
  free_created: "무료 결과 생성",
  payment_pending: "결제 대기",
  paid: "결제 완료",
  premium_created: "심층 리포트 생성",
};

const paymentProviderText: Record<string, string> = {
  kakaopay: "카카오페이",
  paypal: "페이팔",
  mock: "테스트 결제",
};

function buildCurrentPath({
  status,
  readingId,
  ownerEmail,
}: {
  status?: string;
  readingId?: string;
  ownerEmail?: string;
}) {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  if (readingId) {
    params.set("readingId", readingId);
  }

  if (ownerEmail) {
    params.set("ownerEmail", ownerEmail);
  }

  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function Notice({ error, message }: { error?: string; message?: string }) {
  const errorText = error ? errorMessages[error] : null;
  const messageText = message ? successMessages[message] : null;

  if (!errorText && !messageText) {
    return null;
  }

  return (
    <div
      className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-bold ${
        errorText
          ? "border-berry/20 bg-berry/10 text-berry"
          : "border-moss/20 bg-moss/10 text-moss"
      }`}
    >
      {errorText ?? messageText}
    </div>
  );
}

function AdminLogin({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <PageShell
      eyebrow="관리자"
      title="관리자 로그인"
      description="지금은 ADMIN_PASSWORD 환경변수로 보호합니다. 이후 Supabase Auth로 교체할 수 있도록 인증 로직은 별도 모듈에 분리했습니다."
      narrow
    >
      <Notice error={error} message={message} />
      <form action={loginAdminAction} className="warm-panel rounded-[2rem] p-5 sm:p-8">
        <label className="block">
          <span className="text-sm font-black text-ink">관리자 비밀번호</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="mt-3 w-full rounded-2xl border border-berry/15 bg-white/75 px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-berry"
            placeholder="ADMIN_PASSWORD"
            required
          />
        </label>
        <button
          type="submit"
          className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-berry px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-berry/90"
        >
          관리자 페이지 열기
        </button>
      </form>
    </PageShell>
  );
}

function DisabledAdmin() {
  return (
    <PageShell
      eyebrow="관리자"
      title="ADMIN_PASSWORD가 설정되지 않았습니다"
      description=".env에 ADMIN_PASSWORD를 추가한 뒤 서버를 다시 시작하면 관리자 로그인을 사용할 수 있습니다."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-5 text-sm font-semibold leading-6 text-ink/70 sm:p-8">
        예: <code className="rounded bg-white/70 px-2 py-1">ADMIN_PASSWORD=change-me</code>
      </div>
    </PageShell>
  );
}

function FilterForm({
  status,
  readingId,
  ownerEmail,
}: {
  status?: string;
  readingId?: string;
  ownerEmail?: string;
}) {
  return (
    <form className="warm-panel grid gap-4 rounded-[2rem] p-5 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end sm:p-6">
      <label className="block">
        <span className="text-xs font-black uppercase text-persimmon">
          리포트 ID 검색
        </span>
        <input
          name="readingId"
          defaultValue={readingId}
          placeholder="전체 UUID"
          className="mt-2 w-full rounded-2xl border border-berry/15 bg-white/75 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-berry"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase text-persimmon">
          보호자 이메일 검색
        </span>
        <input
          name="ownerEmail"
          defaultValue={ownerEmail}
          placeholder="guardian@example.com"
          className="mt-2 w-full rounded-2xl border border-berry/15 bg-white/75 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-berry"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase text-persimmon">
          결제 상태
        </span>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="mt-2 w-full rounded-2xl border border-berry/15 bg-white/75 px-4 py-3 text-sm font-semibold text-ink outline-none focus:border-berry"
        >
          <option value="">전체</option>
          {adminPaymentStatuses.map((item) => (
            <option key={item} value={item}>
              {paymentStatusText[item]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full bg-moss px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-moss/90"
        >
          검색
        </button>
        <Link
          href="/admin"
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-full border border-berry/20 bg-white/80 px-5 py-3 text-sm font-bold text-berry transition hover:bg-white"
        >
          초기화
        </Link>
      </div>
    </form>
  );
}

function ReadingCard({
  reading,
  returnTo,
}: {
  reading: AdminReadingListItem;
  returnTo: string;
}) {
  return (
    <article className="rounded-2xl border border-berry/10 bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-persimmon">
            {reading.petType === "dog"
              ? "강아지"
              : reading.petType === "cat"
                ? "고양이"
                : "반려동물"}
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">{reading.petName}</h3>
          <p className="mt-1 break-all text-xs font-semibold text-ink/55">
            {reading.id}
          </p>
        </div>
        <span className="w-fit rounded-full bg-moss/10 px-3 py-1 text-xs font-black text-moss">
          {readingStatusText[reading.status] ?? reading.status}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-semibold text-ink/65">
        <p>{reading.ownerEmail}</p>
        <p>생성: {formatDate(reading.createdAt)}</p>
        <p>수정: {formatDate(reading.updatedAt)}</p>
        <p>유료 리포트: {reading.hasPremiumReport ? "생성됨" : "없음"}</p>
      </div>
      <div className="mt-4 grid gap-2 rounded-2xl border border-moss/15 bg-moss/5 p-3 text-xs font-bold text-ink/70 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-black uppercase text-moss">
            심층 결제
          </p>
          <p className={reading.premiumPaymentApproved ? "text-moss" : "text-berry"}>
            {reading.premiumPaymentApproved ? "승인됨" : "미승인"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-moss">
            PDF 다운로드
          </p>
          <p className={reading.pdfDownloadAllowed ? "text-moss" : "text-berry"}>
            {reading.pdfDownloadAllowed ? "가능" : "심층 결제 필요"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-moss">
            구 PDF 결제
          </p>
          <p>{reading.legacyPdfPaymentApproved ? "승인 기록 있음" : "별도 결제 없음"}</p>
        </div>
      </div>
      <form action={regeneratePremiumReportAction} className="mt-4">
        <input type="hidden" name="readingId" value={reading.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button
          type="submit"
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full bg-berry px-5 py-2 text-sm font-bold text-white transition hover:bg-berry/90"
        >
          유료 리포트 재생성
        </button>
      </form>
    </article>
  );
}

function PaymentCard({
  payment,
  returnTo,
}: {
  payment: AdminPaymentListItem;
  returnTo: string;
}) {
  const product = getProductCatalogItem(payment.productType);

  return (
    <article className="rounded-2xl border border-berry/10 bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-persimmon">
            {paymentProviderText[payment.provider] ?? payment.provider} · {product.name}
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">
            {payment.amount.toLocaleString("ko-KR")} {payment.currency}
          </h3>
          <p className="mt-1 text-sm font-semibold text-ink/60">
            {payment.petName} · {payment.ownerEmail}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass[payment.status]}`}
        >
          {paymentStatusText[payment.status]}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-xs font-semibold text-ink/60">
        <div>
          <dt className="font-black text-ink/75">결제 ID</dt>
          <dd className="break-all">{payment.id}</dd>
        </div>
        <div>
          <dt className="font-black text-ink/75">리포트 ID</dt>
          <dd className="break-all">{payment.readingId}</dd>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <p>주문 ID: {payment.providerOrderId ?? "-"}</p>
          <p>카카오 TID: {payment.providerTid ?? "-"}</p>
          <p>외부 결제 ID: {payment.providerPaymentId ?? "-"}</p>
        </div>
        <p>생성: {formatDate(payment.createdAt)}</p>
        <p>수정: {formatDate(payment.updatedAt)}</p>
      </dl>

      <details className="mt-4 rounded-2xl border border-berry/10 bg-cream/50 p-3">
        <summary className="cursor-pointer text-sm font-black text-ink">
          원본 결제 응답 확인
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/75 p-3 text-xs leading-5 text-ink/70">
          {formatJson(payment.rawResponse)}
        </pre>
      </details>

      {payment.status === "failed" && (
        <form action={recheckFailedPaymentAction} className="mt-4">
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full bg-moss px-5 py-2 text-sm font-bold text-white transition hover:bg-moss/90"
          >
            실패한 결제 재확인
          </button>
        </form>
      )}
    </article>
  );
}

function FeedbackCard({ feedback }: { feedback: AdminFeedbackListItem }) {
  return (
    <article className="rounded-2xl border border-moss/15 bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-moss">
            익명 피드백 쨌 {feedback.page}
          </p>
          <h3 className="mt-1 text-lg font-black text-ink">
            만족도 {feedback.rating}/5
          </h3>
          <p className="mt-1 text-sm font-semibold text-ink/60">
            {feedback.testerName} 쨌 {feedback.contact}
          </p>
        </div>
        <span className="w-fit rounded-full bg-persimmon/10 px-3 py-1 text-xs font-black text-persimmon">
          {feedback.petType === "dog"
            ? "강아지"
            : feedback.petType === "cat"
              ? "고양이"
              : "종 미선택"}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-keep rounded-2xl bg-cream/70 px-4 py-3 text-sm font-semibold leading-7 text-ink/72">
        {feedback.message}
      </p>
      <p className="mt-3 text-xs font-bold text-ink/50">
        접수: {formatDate(feedback.createdAt)}
      </p>
    </article>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;

  if (!isAdminPasswordConfigured()) {
    return <DisabledAdmin />;
  }

  if (!(await hasAdminSession())) {
    return <AdminLogin error={params.error} message={params.message} />;
  }

  const status = isPaymentStatus(params.status) ? params.status : undefined;
  const returnTo = buildCurrentPath({
    status,
    readingId: params.readingId,
    ownerEmail: params.ownerEmail,
  });

  let dashboard;
  let loadError: string | null = null;

  try {
    dashboard = await getAdminDashboardData({
      status,
      readingId: params.readingId,
      ownerEmail: params.ownerEmail,
    });
  } catch (error) {
    console.error("Admin dashboard load failed", error);
    loadError = "관리자 데이터를 불러오지 못했습니다.";
  }

  return (
    <PageShell
      eyebrow="관리자"
      title="멍냥사주 관리자"
      description="최근 리포트와 결제 내역을 확인하고, 결제 상태별 필터와 운영용 재처리 액션을 실행합니다."
    >
      <div className="mb-6 flex justify-end">
        <form action={logoutAdminAction}>
          <button
            type="submit"
            className="focus-ring rounded-full border border-berry/20 bg-white/80 px-5 py-2 text-sm font-bold text-berry transition hover:bg-white"
          >
            로그아웃
          </button>
        </form>
      </div>

      <Notice error={params.error} message={params.message} />

      <FilterForm
        status={status}
        readingId={params.readingId}
        ownerEmail={params.ownerEmail}
      />

      {loadError && (
        <div className="mt-6 rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-bold text-berry">
          {loadError}
        </div>
      )}

      {dashboard && !dashboard.configured && (
        <div className="mt-6 rounded-2xl border border-persimmon/20 bg-persimmon/10 px-4 py-3 text-sm font-bold text-persimmon">
          Supabase 환경변수가 설정되지 않아 관리자 데이터를 불러올 수 없습니다.
        </div>
      )}

      {dashboard && !dashboard.readingIdIsSearchable && (
        <div className="mt-6 rounded-2xl border border-persimmon/20 bg-persimmon/10 px-4 py-3 text-sm font-bold text-persimmon">
          리포트 ID 검색은 전체 UUID 형식만 지원합니다.
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-persimmon">
              최근 리포트
            </p>
            <h2 className="text-2xl font-black text-ink">최근 생성된 리포트</h2>
          </div>
          <span className="text-sm font-bold text-ink/55">
            {dashboard?.readings.length ?? 0}건
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard?.readings.map((reading) => (
            <ReadingCard key={reading.id} reading={reading} returnTo={returnTo} />
          ))}
          {dashboard?.readings.length === 0 && (
            <div className="rounded-2xl border border-berry/10 bg-white/65 p-5 text-sm font-semibold text-ink/60">
              조회된 리포트가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-persimmon">
              최근 결제
            </p>
            <h2 className="text-2xl font-black text-ink">최근 결제 내역</h2>
          </div>
          <span className="text-sm font-bold text-ink/55">
            {dashboard?.payments.length ?? 0}건
          </span>
        </div>
        <div className="grid gap-4">
          {dashboard?.payments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} returnTo={returnTo} />
          ))}
          {dashboard?.payments.length === 0 && (
            <div className="rounded-2xl border border-berry/10 bg-white/65 p-5 text-sm font-semibold text-ink/60">
              조회된 결제가 없습니다.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-moss">
              최근 피드백
            </p>
            <h2 className="text-2xl font-black text-ink">베타 테스트 의견</h2>
          </div>
          <span className="text-sm font-bold text-ink/55">
            {dashboard?.feedbacks.length ?? 0}건
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard?.feedbacks.map((feedback) => (
            <FeedbackCard key={feedback.id} feedback={feedback} />
          ))}
          {dashboard?.feedbacks.length === 0 && (
            <div className="rounded-2xl border border-moss/10 bg-white/65 p-5 text-sm font-semibold text-ink/60">
              아직 접수된 피드백이 없습니다.
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
