"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PetMascot } from "@/components/mascot/PetMascot";
import { CheckoutPaymentButtons } from "@/components/payment/CheckoutPaymentButtons";
import { DemoPaymentButton } from "@/components/payment/DemoPaymentButton";
import { PayPalCheckout } from "@/components/payment/PayPalCheckout";
import type { ProductType } from "@/types/database";
import type { PetSpecies } from "@/types/reading";

type CheckoutExperienceProps = {
  readingId: string;
  productType: ProductType;
  productName: string;
  species: PetSpecies;
  price: number;
  currency: string;
  demoModeEnabled?: boolean;
  kakaoPayEnabled?: boolean;
  paypalEnabled?: boolean;
};

const agreements = [
  "결제 후 입력한 정보를 기준으로 리포트가 즉시 생성됩니다.",
  "리포트가 생성·열람된 경우 청약철회가 제한될 수 있어요.",
  "시스템 오류로 리포트가 생성되지 않은 경우 확인 후 환불 처리됩니다.",
];

export function CheckoutExperience({
  readingId,
  productType,
  productName,
  species,
  price,
  currency,
  demoModeEnabled = false,
  kakaoPayEnabled = false,
  paypalEnabled = false,
}: CheckoutExperienceProps) {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    agreements.map(() => false),
  );
  const isAgreed = useMemo(
    () => checkedItems.every(Boolean),
    [checkedItems],
  );
  const hasLivePaymentProvider = kakaoPayEnabled || paypalEnabled;
  const priceLabel = price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
  const stickyCtaLabel =
    productType === "premium_report"
      ? `${priceLabel} 결제하고 리포트 보기`
      : price === 0
        ? "무료로 확인하기"
        : `${priceLabel} 결제하고 콘텐츠 보기`;
  const stickyDisabled = !isAgreed || (!demoModeEnabled && !hasLivePaymentProvider);

  function toggleAgreement(index: number) {
    setCheckedItems((current) =>
      current.map((checked, currentIndex) =>
        currentIndex === index ? !checked : checked,
      ),
    );
  }

  function focusPaymentMethods() {
    document
      .getElementById("checkout-payment-methods")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-6 pb-24">
      <section className="rounded-[2rem] border border-berry/10 bg-white/72 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-persimmon">체크리스트</p>
            <h2 className="mt-1 text-xl font-black text-ink">결제 전 확인</h2>
          </div>
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[1.5rem] bg-moss/10">
            <PetMascot
              species={species}
              mood="holding-card"
              size="sm"
              className="scale-90"
              decorative
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {agreements.map((label, index) => {
            const inputId = `checkout-agreement-${index}`;

            return (
              <div
                key={label}
                className="flex items-start gap-3 rounded-2xl border border-berry/10 bg-cream/55 px-4 py-4"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checkedItems[index]}
                  onChange={() => toggleAgreement(index)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-berry/30 text-berry"
                />
                <div className="text-sm font-semibold leading-6 text-ink/75">
                  <label htmlFor={inputId}>{label}</label>
                  {index === 1 ? (
                    <Link
                      href="/refund"
                      className="ml-2 inline-flex font-black text-berry underline decoration-berry/30 underline-offset-4 transition hover:text-berry/80"
                    >
                      환불정책 보기
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-berry/10 bg-white/72 p-5 sm:p-6">
        <div
          id="checkout-payment-methods"
          className="grid scroll-mt-24 gap-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div>
            <p className="text-sm font-black uppercase text-persimmon">결제 수단</p>
            <h2 className="mt-2 text-xl font-black text-ink">결제수단 선택</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              모든 결제 승인 여부는 서버에서 다시 확인한 뒤 유료 리포트를 엽니다.
            </p>
          </div>
          <PetMascot
            species={species}
            mood="payment"
            size="md"
            withBubble
            bubbleText="결제 후 바로 리포트를 볼 수 있어요"
            decorative
          />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-persimmon/20 bg-persimmon/10 px-4 py-4">
          <p className="text-sm font-black text-persimmon">결제 전 안내</p>
          <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-ink/65">
            <li>결제 후 입력 정보 기준으로 리포트가 즉시 생성됩니다.</li>
            <li>시스템 오류로 리포트가 생성되지 않은 경우 확인 후 환불 처리됩니다.</li>
          </ul>
        </div>

        {demoModeEnabled ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-ink/10 bg-ink/5 px-4 py-3">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-ink/55">
              개발자용
            </span>
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white/65 opacity-70 grayscale">
              <PetMascot
                species={species}
                mood="payment"
                size="sm"
                className="scale-75"
                decorative
              />
            </div>
            <p className="text-sm font-black leading-6 text-ink/60">
              실제 결제가 발생하지 않는 데모 기능입니다.
            </p>
          </div>
        ) : null}

        {demoModeEnabled ? (
          <DemoPaymentButton
            readingId={readingId}
            productType={productType}
            disabled={!isAgreed}
          />
        ) : !hasLivePaymentProvider ? (
          <div className="mt-6 rounded-[2rem] border border-persimmon/25 bg-persimmon/10 p-5">
            <h3 className="text-lg font-black text-ink">결제 준비 중입니다</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/65">
              운영 결제 환경 설정이 완료되면 카카오페이와 PayPal 결제를 이용할 수
              있습니다. 지금은 실제 결제 버튼을 숨겨두었습니다.
            </p>
          </div>
        ) : (
          <>
            {kakaoPayEnabled ? (
              <CheckoutPaymentButtons
                readingId={readingId}
                productType={productType}
                disabled={!isAgreed}
              />
            ) : null}

            {paypalEnabled ? (
              <PayPalCheckout
                readingId={readingId}
                productType={productType}
                currency={currency}
                disabled={!isAgreed}
              />
            ) : null}
          </>
        )}

        {!isAgreed && (
          <p className="mt-4 rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold leading-6 text-moss">
            결제 전 확인 항목을 모두 선택하면 결제 버튼이 활성화됩니다.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-berry/10 bg-cream/95 px-4 py-3 shadow-[0_-12px_40px_rgba(62,44,38,0.12)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="hidden h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/80 sm:grid">
            <PetMascot
              species={species}
              mood="payment"
              size="sm"
              className="scale-75"
              decorative
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-persimmon">
              {productName}
            </p>
            <p className="text-xs font-semibold text-ink/55">
              모든 확인 항목 선택 후 결제할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={focusPaymentMethods}
            disabled={stickyDisabled}
            className="focus-ring inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-berry px-5 py-3 text-sm font-black text-white shadow-soft transition hover:bg-berry/90 disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            <span aria-hidden className="mr-2 grid h-5 w-5 grid-cols-2 gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
              <span className="col-span-2 mx-auto h-2.5 w-3.5 rounded-full bg-white/85" />
            </span>
            {stickyCtaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
