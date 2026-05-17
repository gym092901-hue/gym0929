import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { CheckoutExperience } from "@/components/payment/CheckoutExperience";
import { DemoPaymentResetButton } from "@/components/payment/DemoPaymentResetButton";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import { ReportSceneBanner } from "@/components/report/ReportSceneBanner";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled, isDemoReadingId } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { getCheckoutPaymentStatus } from "@/lib/payment/checkoutStatus";
import {
  getProductCatalogItem,
  getProductResultUrl,
  isProductType,
  productTypes,
} from "@/lib/products/catalog";
import { getReading } from "@/lib/readings";
import { isSiteUrlConfigured } from "@/lib/siteUrl";
import type { ProductType } from "@/types/database";

type CheckoutPageProps = {
  params: Promise<{
    readingId: string;
  }>;
  searchParams: Promise<{
    productType?: string;
    forceCheckout?: string;
  }>;
};

function resolveProductType(value?: string): ProductType {
  return isProductType(value) ? value : "premium_report";
}

function isKakaoPayConfigured() {
  return Boolean(
    process.env.KAKAOPAY_CLIENT_ID &&
      process.env.KAKAOPAY_SECRET_KEY &&
      process.env.KAKAOPAY_CID &&
      process.env.KAKAOPAY_BASE_URL &&
      isSiteUrlConfigured(),
  );
}

function isPayPalConfigured() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_BASE_URL &&
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
      isSiteUrlConfigured(),
  );
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { readingId } = await params;
  const {
    productType: productTypeParam,
    forceCheckout: forceCheckoutParam,
  } = await searchParams;
  const demoModeEnabled = isDemoModeEnabled();
  const forceCheckout = demoModeEnabled && forceCheckoutParam === "1";

  if (isDemoReadingId(readingId) && !demoModeEnabled) {
    redirect("/sample");
  }

  const productType = resolveProductType(productTypeParam);
  const product = getProductCatalogItem(productType);
  const reading = await getReading(readingId);

  if (!reading) {
    notFound();
  }

  const petNamePossessive = postposition.possessive(reading.petName);
  const checkoutDescription = createCheckoutDescription(
    reading.petName,
    productType,
  );

  if (productType === "pdf_report") {
    const premiumAccess = await checkPaymentAccess(readingId, "premium_report");

    if (premiumAccess.hasAccess) {
      redirect(getProductResultUrl(readingId, "pdf_report"));
    }

    redirect(
      `/checkout/${readingId}?productType=premium_report${
        forceCheckout ? "&forceCheckout=1" : ""
      }`,
    );
  }

  const currentAccess = await checkPaymentAccess(readingId, productType);
  const checkoutStatus = await getCheckoutPaymentStatus(readingId, productType);
  const resultUrl = getProductResultUrl(readingId, productType);
  const productStatuses = await Promise.all(
    productTypes.map(async (type) => ({
      product: getProductCatalogItem(type),
      status: await getCheckoutPaymentStatus(readingId, type),
    })),
  );
  const prerequisiteAccess = product.prerequisite
    ? await checkPaymentAccess(readingId, product.prerequisite)
    : null;
  const prerequisiteProduct = product.prerequisite
    ? getProductCatalogItem(product.prerequisite)
    : null;
  const isPrerequisiteMissing =
    Boolean(product.prerequisite) && !prerequisiteAccess?.hasAccess;
  const purchasableProductTypes = productTypes.filter(
    (type) => type !== "pdf_report",
  );

  if (currentAccess.hasAccess && !forceCheckout && !isPrerequisiteMissing) {
    redirect(resultUrl);
  }

  return (
    <PageShell
      eyebrow="결제하기"
      title={`${petNamePossessive} ${product.name} 결제`}
      description="결제 완료 여부는 서버에서 확인하며, 승인된 상품만 열람할 수 있습니다."
      narrow
      mascotType={reading.species}
    >
      <ReportMobileBar
        title="결제하기"
        backHref={`/result/free/${reading.id}`}
        rightLabel={formatProductPrice(product.price)}
        rightHref="#checkout-payment-methods"
      />

      <ReportSceneBanner
        type={reading.species}
        title={`${reading.petName} 결제 안내`}
        bubbleText="결제 후 바로 리포트를 볼 수 있어요"
        className="mb-6"
      />

      <div className="grid gap-6">
        <section className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <div className="grid gap-5 border-b border-berry/10 pb-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase text-persimmon">
                상품 정보
              </p>
              <div className="mt-2">
                <h2 className="text-2xl font-black text-ink">
                  {product.name}
                </h2>
                <p className="mt-3 break-keep text-base font-semibold leading-7 text-ink/70">
                  {checkoutDescription}
                </p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <span className="rounded-2xl bg-berry/10 px-4 py-3 text-sm font-black text-berry">
                  심층 리포트 2,900원
                </span>
                <span className="rounded-2xl bg-persimmon/10 px-4 py-3 text-sm font-black text-persimmon">
                  추가 콘텐츠 1,000원
                </span>
                <span className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-black text-moss">
                  PDF 무료
                </span>
              </div>
            </div>
            <div className="grid gap-3 rounded-[1.75rem] border border-berry/10 bg-white/75 p-4 text-center shadow-sm sm:min-w-52">
              <PetMascot
                type={reading.species}
                mood="payment"
                size="lg"
                withBubble
                bubbleText="영수증은 제가 챙길게요"
                label={`${reading.petName} 결제를 안내하는 픽셀 캐릭터`}
              />
              <div className="rounded-[1.25rem] bg-berry/10 px-5 py-4">
                <p className="text-sm font-bold text-berry">
                  {product.price === 0 ? "제공 가격" : "결제 금액"}
                </p>
                <p className="mt-1 text-3xl font-black text-berry">
                  {formatProductPrice(product.price)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-black text-ink">포함 내용</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {product.includedItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-berry/10 bg-white/70 px-4 py-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moss text-sm font-black text-white">
                    ✓
                  </span>
                  <span className="text-sm font-bold text-ink/75">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isPrerequisiteMissing && prerequisiteProduct ? (
          <section className="rounded-[2rem] border border-persimmon/25 bg-persimmon/10 p-5 sm:p-6">
            <div className="rounded-[1.5rem] bg-white/80 p-5">
              <p className="text-sm font-black text-persimmon">
                먼저 필요한 상품이 있어요
              </p>
              <h2 className="mt-2 break-keep text-2xl font-black text-ink">
                PDF 저장은 심층 리포트 구매 후 이용할 수 있어요.
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">
                PDF는 심층 리포트 내용을 표지와 요약 카드가 포함된 파일로
                정리하는 무료 소장본입니다. 먼저 {prerequisiteProduct.name}를
                열람한 뒤 PDF를 다운로드할 수 있습니다.
              </p>
              <PrimaryLink
                href={`/checkout/${readingId}?productType=${prerequisiteProduct.productType}${
                  forceCheckout ? "&forceCheckout=1" : ""
                }`}
                tone="moss"
                className="mt-5"
              >
                먼저 심층 리포트 보기
              </PrimaryLink>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-berry/10 bg-white/70 p-5 sm:p-6">
          <h2 className="text-xl font-black text-ink">다른 상품 선택</h2>
          <div className="mt-4 grid gap-3">
            {purchasableProductTypes.map((type) => {
              const catalogItem = getProductCatalogItem(type);
              const isSelected = type === productType;
              const href = `/checkout/${readingId}?productType=${type}${
                forceCheckout ? "&forceCheckout=1" : ""
              }`;

              return (
                <Link
                  key={type}
                  href={href}
                  className={`focus-ring rounded-2xl border px-4 py-4 transition ${
                    isSelected
                      ? "border-berry/40 bg-berry/10 text-berry"
                      : "border-berry/10 bg-white/65 text-ink/75 hover:border-berry/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black">{catalogItem.name}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                        {catalogItem.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black">
                      {formatProductPrice(catalogItem.price)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-berry/10 bg-white/70 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-persimmon">
                상품별 결제 상태
              </p>
              <h2 className="mt-1 text-xl font-black text-ink">
                현재 리포트의 구매 현황
              </h2>
            </div>
            {forceCheckout ? (
              <span className="rounded-full bg-berry/10 px-3 py-1 text-xs font-black text-berry">
                데모 강제 체크아웃 보기
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {productStatuses
              .filter(({ product: item }) => item.productType !== "pdf_report")
              .map(({ product: item, status }) => (
              <Link
                key={item.productType}
                href={`/checkout/${readingId}?productType=${item.productType}${
                  forceCheckout ? "&forceCheckout=1" : ""
                }`}
                className={`focus-ring flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 transition ${
                  item.productType === productType
                    ? "border-berry/35 bg-berry/10"
                    : "border-berry/10 bg-white/65 hover:border-berry/25"
                }`}
              >
                <span>
                  <span className="block text-sm font-black text-ink">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-ink/50">
                    {formatProductPrice(item.price)}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusBadgeClass(
                    status.state,
                  )}`}
                >
                  {status.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-6">
          <p className="text-sm font-black text-moss">PDF 무료 저장</p>
          <h2 className="mt-2 break-keep text-xl font-black text-ink">
            심층 리포트 구매자에게 무료로 제공됩니다
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">
            심층 리포트가 열리면 프리미엄 결과 페이지에서 바로 PDF를 저장할 수
            있습니다. 별도 PDF 결제는 필요하지 않습니다.
          </p>
        </section>

        <section
          className={`rounded-[2rem] border p-5 sm:p-6 ${statusToneClass(
            checkoutStatus.state,
          )}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">현재 결제 상태</p>
              <h2 className="mt-2 text-2xl font-black text-ink">
                {checkoutStatus.label}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/65">
                {checkoutStatus.description}
              </p>
              {checkoutStatus.paymentId ? (
                <p className="mt-2 break-all text-xs font-semibold text-ink/45">
                  결제 식별자: {checkoutStatus.paymentId}
                </p>
              ) : null}
            </div>
            {currentAccess.hasAccess ? (
              <div className="grid gap-3 sm:min-w-56">
                <PrimaryLink href={resultUrl} tone="moss" className="shrink-0">
                  {productType === "premium_report"
                    ? "이미 구매한 리포트입니다. 리포트 보러가기"
                    : "구매한 콘텐츠 보기"}
                </PrimaryLink>
                {demoModeEnabled && checkoutStatus.provider === "mock" ? (
                  <DemoPaymentResetButton
                    readingId={readingId}
                    productType={productType}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {!isPrerequisiteMissing && checkoutStatus.canStartPayment ? (
          <CheckoutExperience
            readingId={reading.id}
            productType={product.productType}
            productName={product.name}
            species={reading.species}
            price={product.price}
            currency={product.currency}
            demoModeEnabled={demoModeEnabled}
            kakaoPayEnabled={isKakaoPayConfigured()}
            paypalEnabled={isPayPalConfigured()}
          />
        ) : currentAccess.hasAccess || isPrerequisiteMissing ? null : (
          <section className="rounded-[2rem] border border-persimmon/20 bg-white/72 p-5 sm:p-6">
            <h2 className="text-xl font-black text-ink">
              결제 승인 대기 중입니다
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/65">
              새 결제를 중복으로 만들지 않도록 결제 버튼을 잠시 숨겼습니다.
              결제를 완료했는데도 결과가 열리지 않으면 실패 또는 취소 화면에서
              돌아와 다시 시도해 주세요.
            </p>
          </section>
        )}

        {demoModeEnabled ? (
          <section className="rounded-[2rem] border border-berry/10 bg-white/55 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-black text-ink/55">
                개발자용
              </span>
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white/70 opacity-70 grayscale">
                <PetMascot
                  type={reading.species}
                  mood="curious"
                  size="sm"
                  label="데모 링크를 안내하는 회색 톤 반려동물 픽셀 캐릭터"
                  className="scale-75"
                />
              </div>
              <p className="text-sm font-black text-ink/55">
                데모 모드에서만 노출되는 실패 화면 확인 링크입니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href={`/payment/kakao/fail?readingId=${readingId}`}
                className="focus-ring rounded-2xl border border-berry/20 bg-white/70 px-5 py-4 text-center text-sm font-bold text-ink/70 transition hover:text-berry"
              >
                카카오페이 실패 화면 보기
              </Link>
              <Link
                href={`/payment/kakao/cancel?readingId=${readingId}`}
                className="focus-ring rounded-2xl border border-berry/20 bg-white/70 px-5 py-4 text-center text-sm font-bold text-ink/70 transition hover:text-berry"
              >
                카카오페이 취소 화면 보기
              </Link>
              <Link
                href={`/payment/paypal/fail?readingId=${readingId}`}
                className="focus-ring rounded-2xl border border-berry/20 bg-white/70 px-5 py-4 text-center text-sm font-bold text-ink/70 transition hover:text-berry"
              >
                페이팔 실패 화면 보기
              </Link>
            </div>

            <p className="mt-5 text-sm leading-6 text-ink/60">
              데모 검수용 링크입니다. 실패 또는 취소 후에는 이 페이지로 돌아와
              다시 결제할 수 있습니다.
            </p>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function formatProductPrice(price: number) {
  return price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
}

function createCheckoutDescription(petName: string, productType: ProductType) {
  if (productType === "premium_report") {
    return `${postposition.possessive(petName)} 오행 밸런스, 애착 방식, 생활 루틴, 올해의 흐름을 한 번에 읽는 심층 리포트예요.`;
  }

  if (productType === "guardian_match") {
    return `${petName}와 보호자가 서로 편안해지는 애착 방식과 교감 포인트를 다정하게 읽어드려요.`;
  }

  if (productType === "two_pet_match") {
    return `두 아이가 함께 지낼 때 편해지는 거리감, 놀이 리듬, 공간 조율 포인트를 정리해드려요.`;
  }

  if (productType === "yearly_fortune") {
    return `${petName}의 2026년 생활 흐름을 계절과 월별 체크리스트로 부드럽게 살펴보는 리포트예요.`;
  }

  return `심층 리포트를 표지와 요약 카드가 포함된 PDF로 무료 저장할 수 있어요.`;
}

function statusToneClass(state: string) {
  if (state === "approved" || state === "demo_approved") {
    return "border-moss/25 bg-moss/10 text-moss";
  }

  if (state === "pending") {
    return "border-persimmon/25 bg-persimmon/10 text-persimmon";
  }

  if (state === "failed" || state === "canceled") {
    return "border-berry/25 bg-berry/10 text-berry";
  }

  return "border-ink/10 bg-white/65 text-ink/65";
}

function statusBadgeClass(state: string) {
  if (state === "approved" || state === "demo_approved") {
    return "bg-moss/10 text-moss";
  }

  if (state === "pending") {
    return "bg-persimmon/10 text-persimmon";
  }

  if (state === "failed" || state === "canceled") {
    return "bg-berry/10 text-berry";
  }

  return "bg-ink/5 text-ink/55";
}
