import { PawPattern } from "@/components/mascot/PawPattern";
import { PetMascot } from "@/components/mascot/PetMascot";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { demoReadingId, isDemoModeEnabled } from "@/lib/demo/config";

const freeItems = ["기본 성향", "대표 기운", "교감 포인트"];

const premiumItems = [
  "오행 밸런스",
  "애착 방식",
  "생활 루틴",
  "올해의 흐름",
  "PDF 무료 저장",
];

const reassuranceItems = [
  "질병이나 수명을 예측하지 않아요.",
  "사고를 단정하거나 불안을 키우지 않아요.",
  "반려생활을 더 다정하게 이해하기 위한 콘텐츠예요.",
];

function CtaPaw({ tone = "light" }: { tone?: "light" | "berry" }) {
  const dotClass = tone === "light" ? "bg-white/85" : "bg-berry/55";

  return (
    <span
      aria-hidden
      className="mascot-bob mr-2 grid h-5 w-5 grid-cols-2 gap-0.5"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className={`col-span-2 mx-auto h-2.5 w-3.5 rounded-full ${dotClass}`} />
    </span>
  );
}

function FourLeafClover({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid h-12 w-12 grid-cols-2 gap-0.5 rotate-[-12deg] rounded-full bg-white/55 p-2 shadow-sm ${className}`}
    >
      <span className="rounded-br-full rounded-tl-full bg-moss/55" />
      <span className="rounded-bl-full rounded-tr-full bg-moss/55" />
      <span className="rounded-bl-full rounded-tr-full bg-moss/55" />
      <span className="rounded-br-full rounded-tl-full bg-moss/55" />
    </span>
  );
}

function HeroCardDecoration({
  className = "",
  tone = "berry",
}: {
  className?: string;
  tone?: "berry" | "moss" | "persimmon";
}) {
  const toneClass = {
    berry: "border-berry/10 bg-white/85",
    moss: "border-moss/15 bg-white/85",
    persimmon: "border-persimmon/15 bg-white/85",
  }[tone];
  const barClass = {
    berry: "bg-berry/35",
    moss: "bg-moss/35",
    persimmon: "bg-persimmon/35",
  }[tone];

  return (
    <span
      aria-hidden
      className={`rounded-2xl border px-4 py-3 shadow-soft ${toneClass} ${className}`}
    >
      <span className={`block h-2 w-16 rounded-full ${barClass}`} />
      <span className={`mt-2 block h-2 w-10 rounded-full ${barClass}`} />
    </span>
  );
}

function HeroCalendarDecoration({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`rounded-2xl border border-persimmon/15 bg-white/85 px-4 py-3 shadow-sm ${className}`}
    >
      <span className="mb-2 block h-2 rounded-full bg-persimmon/30" />
      <span className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className="h-2 w-2 rounded-full bg-persimmon/25"
          />
        ))}
      </span>
    </span>
  );
}

function HeroSparkle({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid h-12 w-12 place-items-center rounded-full bg-persimmon/20 ${className}`}
    >
      <span className="relative h-6 w-6">
        <span className="absolute left-2 top-0 h-6 w-2 rounded-full bg-persimmon/45" />
        <span className="absolute left-0 top-2 h-2 w-6 rounded-full bg-persimmon/45" />
      </span>
    </span>
  );
}

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
            <div className="relative mt-6">
              <span
                aria-hidden
                className="mascot-bob absolute -left-2 -top-3 hidden h-8 w-8 rotate-[-10deg] rounded-xl border border-persimmon/20 bg-white/80 shadow-sm sm:block"
              >
                <span className="mx-auto mt-2 block h-1.5 w-4 rounded-full bg-persimmon/40" />
                <span className="mx-auto mt-1 block h-1.5 w-3 rounded-full bg-berry/30" />
              </span>
              <span
                aria-hidden
                className="absolute -right-4 top-2 hidden h-6 w-6 rotate-12 rounded-full bg-moss/15 sm:grid sm:place-items-center"
              >
                <span className="h-3 w-3 rounded-full bg-moss/35" />
              </span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/input" className="min-h-14 text-base sm:min-w-48">
                  <CtaPaw />
                  무료 사주 맛보기 시작
                </PrimaryLink>
                <PrimaryLink
                  href={sampleHref}
                  tone="light"
                  className="min-h-14 text-base sm:min-w-48"
                >
                  <CtaPaw tone="berry" />
                  샘플 리포트 보기
                </PrimaryLink>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-ink/55">
              무료 맛보기는 무료로 볼 수 있고, 심층 리포트는 원할 때만
              2,900원으로 열람해요.
            </p>
          </div>

          <div className="warm-panel relative min-h-[27rem] overflow-hidden rounded-[2rem]">
            <PawPattern className="absolute inset-0 h-full w-full opacity-55" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(233,119,77,0.18),rgba(75,123,90,0.11)_52%,rgba(165,61,98,0.12))]" />
            <HeroCardDecoration className="mascot-bob absolute left-8 top-12 rotate-[-10deg]" />
            <HeroCardDecoration
              tone="moss"
              className="absolute right-8 top-28 rotate-6"
            />
            <HeroCalendarDecoration className="absolute bottom-16 right-10 rotate-[-7deg]" />
            <HeroSparkle className="absolute right-9 top-16" />
            <HeroSparkle className="absolute bottom-20 left-12 h-10 w-10 bg-moss/15 [&_span_span]:bg-moss/45" />
            <FourLeafClover className="absolute bottom-28 right-28 hidden sm:grid" />
            <div className="relative grid min-h-[27rem] place-items-center p-5 text-center">
              <div
                aria-hidden
                className="absolute bottom-20 left-1/2 z-0 grid w-44 -translate-x-1/2 gap-2 rounded-[1.5rem] border border-white/70 bg-white/75 p-3 shadow-soft sm:bottom-24"
              >
                <span className="h-2 w-24 rounded-full bg-berry/30" />
                <span className="h-2 w-32 rounded-full bg-moss/25" />
                <span className="h-2 w-20 rounded-full bg-persimmon/30" />
              </div>
              <PetMascot
                type="both"
                mood="reading"
                size="hero"
                withBubble
                bubbleText="우리 아이 마음결을 살짝 읽어볼까요?"
                label="홈 화면에서 리포트를 함께 보는 강아지와 고양이 캐릭터"
              />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-black">
                <span className="rounded-full bg-white/85 px-4 py-2 text-berry shadow-sm">
                  강아지
                </span>
                <span className="rounded-full bg-white/85 px-4 py-2 text-moss shadow-sm">
                  고양이
                </span>
              </div>
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
              <div className="mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-[1.5rem] bg-berry/10">
                <PetMascot
                  type="dog"
                  mood="happy"
                  size="sm"
                  label="무료 사주 맛보기를 안내하는 작은 강아지 캐릭터"
                  className="scale-90"
                />
              </div>
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
              <div className="mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-[1.5rem] bg-white/70">
                <PetMascot
                  type="cat"
                  mood="holding-card"
                  size="sm"
                  label="유료 심층 리포트를 안내하는 고양이 캐릭터"
                  className="scale-90"
                />
              </div>
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
              <div className="mt-5 grid max-w-xs place-items-center rounded-[2rem] border border-moss/15 bg-moss/10 p-4">
                <div className="h-14 w-52 rounded-[50%] bg-persimmon/15" />
                <PetMascot
                  type="both"
                  mood="sleepy"
                  size="lg"
                  label="담요 위에 앉아 쉬는 강아지와 고양이 캐릭터"
                  className="-mt-14"
                />
              </div>
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
