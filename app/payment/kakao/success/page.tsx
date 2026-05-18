import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { approvePayment } from "@/lib/payment/approvePayment";

type KakaoSuccessPageProps = {
  searchParams: Promise<{
    pg_token?: string;
    paymentId?: string;
    readingId?: string;
  }>;
};

export default async function KakaoSuccessPage({
  searchParams,
}: KakaoSuccessPageProps) {
  const { pg_token: pgToken, paymentId, readingId } = await searchParams;
  const retryHref = readingId ? `/checkout/${readingId}` : "/input";

  if (isDemoModeEnabled()) {
    return (
      <PageShell
        eyebrow="KakaoPay"
        title="데모 모드에서는 실제 카카오페이 승인을 호출하지 않습니다"
        description="무료 데모 흐름에서는 checkout 페이지의 데모 결제 승인 버튼을 사용해주세요."
        narrow
      >
        <div className="warm-panel rounded-[2rem] p-6 sm:p-8">
          <PrimaryLink href={retryHref} className="w-full">
            checkout으로 돌아가기
          </PrimaryLink>
        </div>
      </PageShell>
    );
  }

  if (!pgToken || !paymentId || !readingId) {
    return (
      <PageShell
        eyebrow="KakaoPay"
        title="카카오페이 승인 정보를 확인할 수 없습니다"
        description="결제 승인에 필요한 정보가 누락되었습니다. 결제를 다시 시도해주세요."
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

  let nextUrl: string;

  try {
    const approval = await approvePayment({
      provider: "kakaopay",
      paymentId,
      providerPayload: {
        pg_token: pgToken,
        readingId,
      },
    });
    nextUrl = approval.nextUrl;
  } catch (error) {
    console.error("KakaoPay approve page failed", {
      paymentId,
      readingId,
      error,
    });

    return (
      <PageShell
        eyebrow="KakaoPay"
        title="카카오페이 결제 승인이 완료되지 않았습니다"
        description="결제 승인 처리 중 문제가 발생했습니다. 결제 내역을 확인한 뒤 다시 시도해주세요."
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

  redirect(nextUrl);
}
