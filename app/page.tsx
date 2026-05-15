import Image from "next/image";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { demoReadingId, isDemoModeEnabled } from "@/lib/demo/config";

const freeItems = ["기본 성향", "대표 기운", "교감 포인트"];

const premiumItems = [
  "오행 밸런스",
  "애착 방식",
  "생활 루틴",
  "올해의 흐름",
  "PDF 소장본",
];

const reassuranceItems = [
  "질병이나 수명을 예측하지 않아요.",
  "사고를 단정하거나 불안을 키우지 않아요.",
  "반려생활을 더 다정하게 이해하기 위한 콘텐츠예요.",
];

export default function Home() {
  const sampleHref = isDemoModeEnabled()
    ? `/result/free/${demoReadingId}`
    : "/sample";

  return (
    <main>
      <section className="px-4 pb-10 pt-7 sm:px-6 sm:pb-16 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-black text-persimmon">
              반려동물 사주 리포트
            </p>
            <h1 className="max-w-full break-keep text-3xl font-black leading-tight text-ink [overflow-wrap:anywhere] sm:max-w-2xl sm:text-6xl">
              우리 아이는 왜 나에게만 이렇게 다르게 굴까?
            </h1>
            <p className="mt-4 max-w-xl break-keep text-lg font-black leading-7 text-berry sm:text-2xl sm:leading-9">
              생년월일과 처음 만난 날로 보는 강아지·고양이 사주 리포트
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink/70 sm:text-lg">
              멍냥사주는 생일, 입양일, 생활 리듬을 바탕으로 아이의 오행 성향과
              보호자에게 보내는 작은 신호를 따뜻하게 풀어드립니다.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/input" className="min-h-14 text-base sm:min-w-48">
                우리 아이 사주 보기
              </PrimaryLink>
              <PrimaryLink
                href={sampleHref}
                tone="light"
                className="min-h-14 text-base sm:min-w-48"
              >
                샘플 리포트 보기
              </PrimaryLink>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/55">
              결제 전 무료 맛보기로 먼저 확인할 수 있어요.
            </p>
          </div>

          <div className="warm-panel overflow-hidden rounded-[2rem]">
            <div className="grid gap-4 bg-[linear-gradient(135deg,rgba(233,119,77,0.16),rgba(75,123,90,0.1)_52%,rgba(165,61,98,0.1))] p-4 sm:p-5">
              <figure className="relative h-56 overflow-hidden rounded-[1.5rem] bg-white shadow-soft sm:h-64">
                <Image
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80"
                  alt="따뜻한 표정의 강아지"
                  fill
                  sizes="(min-width: 1024px) 430px, 100vw"
                  className="object-cover"
                  priority
                />
                <figcaption className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-berry shadow-soft">
                  강아지
                </figcaption>
              </figure>

              <figure className="relative h-56 overflow-hidden rounded-[1.5rem] bg-white shadow-soft sm:ml-14 sm:h-64">
                <Image
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80"
                  alt="편안히 바라보는 고양이"
                  fill
                  sizes="(min-width: 1024px) 430px, 100vw"
                  className="object-cover"
                  priority
                />
                <figcaption className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-moss shadow-soft">
                  고양이
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-berry/10 bg-white/55 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-black text-persimmon">무료와 유료 차이</p>
            <h2 className="mt-2 break-keep text-2xl font-black leading-tight text-ink sm:text-4xl">
              가볍게 보고, 마음에 들면 깊게 읽어요
            </h2>
            <p className="mt-4 text-base leading-7 text-ink/65">
              무료 결과는 아이의 첫인상을 빠르게 보여주고, 심층 리포트는 실제
              생활에서 어떻게 교감하면 좋을지 더 자세히 안내합니다.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[2rem] border border-berry/10 bg-white/80 p-5">
              <p className="text-sm font-black text-berry">무료 사주 맛보기</p>
              <h3 className="mt-2 text-xl font-black text-ink">
                먼저 확인하는 성향 힌트
              </h3>
              <ul className="mt-4 grid gap-2 text-sm font-semibold text-ink/70">
                {freeItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-berry/10 text-xs font-black text-berry">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2rem] border border-moss/20 bg-moss/10 p-5">
              <p className="text-sm font-black text-moss">유료 심층 리포트</p>
              <h3 className="mt-2 text-xl font-black text-ink">
                보호자를 위한 자세한 해석
              </h3>
              <ul className="mt-4 grid gap-2 text-sm font-semibold text-ink/70">
                {premiumItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-moss/15 text-xs font-black text-moss">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-berry/10 bg-white/70 p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-persimmon">안심하고 읽는 표현</p>
              <h2 className="mt-2 break-keep text-2xl font-black text-ink">
                무섭게 말하지 않고, 다정하게 해석합니다
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {reassuranceItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-cream/70 px-4 py-3 text-sm font-bold leading-6 text-ink/70"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
