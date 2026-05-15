"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckoutPaymentButtons } from "@/components/payment/CheckoutPaymentButtons";
import { DemoPaymentButton } from "@/components/payment/DemoPaymentButton";
import { PayPalCheckout } from "@/components/payment/PayPalCheckout";
import type { ProductType } from "@/types/database";

type CheckoutExperienceProps = {
  readingId: string;
  productType: ProductType;
  currency: string;
  demoModeEnabled?: boolean;
  kakaoPayEnabled?: boolean;
  paypalEnabled?: boolean;
};

const agreements = [
  "본 상품은 결제 후 즉시 생성되는 디지털 콘텐츠입니다.",
  "결제 완료 후 리포트가 생성·열람된 경우 청약철회가 제한될 수 있습니다.",
  "입력한 정보가 정확한지 확인했습니다.",
];

export function CheckoutExperience({
  readingId,
  productType,
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

  function toggleAgreement(index: number) {
    setCheckedItems((current) =>
      current.map((checked, currentIndex) =>
        currentIndex === index ? !checked : checked,
      ),
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-berry/10 bg-white/72 p-5 sm:p-6">
        <h2 className="text-xl font-black text-ink">결제 전 확인</h2>
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
        <div>
          <p className="text-sm font-black uppercase text-persimmon">결제 수단</p>
          <h2 className="mt-2 text-xl font-black text-ink">결제수단 선택</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            모든 결제 승인 여부는 서버에서 다시 확인한 뒤 유료 리포트를 엽니다.
          </p>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-persimmon/20 bg-persimmon/10 px-4 py-4">
          <p className="text-sm font-black text-persimmon">결제 전 안내</p>
          <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-ink/65">
            <li>결제 후 입력 정보 기준으로 리포트가 즉시 생성됩니다.</li>
            <li>시스템 오류로 리포트가 생성되지 않은 경우 확인 후 환불 처리됩니다.</li>
          </ul>
        </div>

        {demoModeEnabled ? (
          <p className="mt-5 rounded-[1.5rem] border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-black leading-6 text-moss">
            실제 결제가 발생하지 않는 데모 기능입니다.
          </p>
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
    </div>
  );
}
