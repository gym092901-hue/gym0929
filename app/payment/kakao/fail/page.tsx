import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { updatePaymentStatus } from "@/lib/payment/updatePaymentStatus";

type KakaoFailPageProps = {
  searchParams: Promise<{
    paymentId?: string;
    readingId?: string;
  }>;
};

export default async function KakaoFailPage({ searchParams }: KakaoFailPageProps) {
  const { paymentId, readingId } = await searchParams;
  const retryHref = readingId ? `/checkout/${readingId}` : "/input";

  if (paymentId && readingId) {
    let redirectHref: string | null = null;

    try {
      const payment = await updatePaymentStatus({
        paymentId,
        readingId,
        status: "failed",
        rawResponse: {
          fail: {
            provider: "kakaopay",
            reason: "redirected_to_fail_url",
          },
        },
      });
      redirectHref = `/checkout/${payment.reading_id}?productType=${payment.product_type}&paymentStatus=failed`;
    } catch (error) {
      console.error("KakaoPay fail status update failed", {
        paymentId,
        readingId,
        error,
      });
    }

    if (redirectHref) {
      redirect(redirectHref);
    }
  }

  return (
    <PageShell
      eyebrow="KakaoPay"
      title="카카오페이 결제가 완료되지 않았습니다"
      description="결제 정보 확인 또는 다른 결제수단 선택이 필요합니다."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-6 sm:p-8">
        <PrimaryLink href={retryHref} className="w-full">
          결제 다시 시도하기
        </PrimaryLink>
      </div>
    </PageShell>
  );
}
