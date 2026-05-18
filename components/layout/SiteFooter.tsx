import Link from "next/link";
import { PawPattern } from "@/components/mascot/PawPattern";
import { PetMascot } from "@/components/mascot/PetMascot";
import { isProductionRuntime } from "@/lib/demo/config";

export function SiteFooter() {
  const showBetaFeedbackLink = isProductionRuntime();

  return (
    <footer className="relative overflow-hidden border-t border-berry/10 bg-white/50">
      <PawPattern className="absolute inset-x-0 top-0 h-24 w-full opacity-35" />
      <div className="relative mx-auto grid max-w-6xl gap-5 px-4 py-8 text-sm text-ink/70 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-cream/80 shadow-sm">
            <PetMascot
              type="both"
              mood="sleepy"
              size="sm"
              label="푸터를 장식하는 강아지와 고양이 캐릭터"
              className="scale-90"
            />
          </div>
          <div>
          <p className="font-bold text-ink">멍냥사주</p>
          <p className="mt-2 max-w-xl leading-6">
            본 서비스는 반려동물을 더 다정하게 이해하기 위한 엔터테인먼트 콘텐츠입니다.
            건강, 수명, 사고를 예측하거나 의학적 판단을 제공하지 않습니다.
          </p>
          </div>
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
          {showBetaFeedbackLink ? (
            <Link
              href="/test"
              className="text-xs text-ink/45 transition hover:text-berry"
            >
              베타 피드백
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
