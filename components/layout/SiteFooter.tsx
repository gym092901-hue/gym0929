import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-berry/10 bg-white/50">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 text-sm text-ink/70 sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <p className="font-bold text-ink">멍냥사주</p>
          <p className="mt-2 max-w-xl leading-6">
            본 서비스는 반려동물을 더 다정하게 이해하기 위한 엔터테인먼트 콘텐츠입니다.
            건강, 수명, 사고를 예측하거나 의학적 판단을 제공하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 font-semibold">
          <Link href="/terms" className="transition hover:text-berry">
            이용약관
          </Link>
          <Link href="/privacy" className="transition hover:text-berry">
            개인정보처리방침
          </Link>
          <Link href="/refund" className="transition hover:text-berry">
            환불정책
          </Link>
        </div>
      </div>
    </footer>
  );
}
