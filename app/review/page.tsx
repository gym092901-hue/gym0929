import type { ReactNode } from "react";
import { loginAdminAction } from "@/app/admin/actions";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { PetElementBalance } from "@/components/report/PetElementBalance";
import { PetHookCard } from "@/components/report/PetHookCard";
import { ReportMobileBar } from "@/components/report/ReportMobileBar";
import { ReportSceneBanner } from "@/components/report/ReportSceneBanner";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import {
  hasAdminSession,
  isAdminPasswordConfigured,
} from "@/lib/admin/auth";
import { isProductionRuntime } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { getProductCatalogItem } from "@/lib/products/catalog";
import { createFreeInsightSections } from "@/lib/readings/content";
import { generatePetHookFromSajuInput } from "@/lib/saju/petHookGenerator";
import { calculatePetFiveElements } from "@/lib/saju/petSajuEngine";
import { generatePremiumReport } from "@/lib/saju/premiumReportGenerator";

export const metadata = {
  title: "멍냥사주 전체 미리보기",
  description:
    "무료 결과부터 심층 리포트, PDF 저장까지 한 번에 확인하는 검토용 페이지입니다.",
};

const samplePet = {
  name: "몽이",
  type: "dog" as const,
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
};

type ReviewPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const reviewErrorMessages: Record<string, string> = {
  invalid_password: "비밀번호가 올바르지 않습니다.",
};

const anchorItems = [
  { href: "#review-free", label: "무료 사주 맛보기" },
  { href: "#review-checkout", label: "결제 화면 구성" },
  { href: "#review-premium", label: "유료 심층 리포트" },
  { href: "#review-elements", label: "오행 밸런스" },
  { href: "#review-pdf", label: "PDF 저장 안내" },
];

function createPremiumSections(report: string) {
  return report
    .split(/\n(?=\d+\.\s)/)
    .filter(Boolean)
    .slice(0, 4)
    .map((section, index) => {
      const [rawTitle, ...bodyLines] = section.trim().split("\n");

      return {
        title:
          rawTitle?.replace(/^\d+\.\s*/, "").trim() ||
          `심층 해석 ${index + 1}`,
        body: bodyLines.join("\n").trim() || section.trim(),
      };
    });
}

function ReviewBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-persimmon/10 px-3 py-1 text-xs font-black text-persimmon">
      {children}
    </span>
  );
}

function ReviewAdminLogin({ error }: { error?: string }) {
  return (
    <PageShell
      eyebrow="관리자 검토"
      title="멍냥사주 검토 페이지"
      description="/review는 정식 운영 환경에서 관리자만 볼 수 있는 내부 검토 페이지입니다."
      narrow
    >
      {error && reviewErrorMessages[error] ? (
        <div className="mb-5 rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-bold text-berry">
          {reviewErrorMessages[error]}
        </div>
      ) : null}
      <form action={loginAdminAction} className="warm-panel rounded-[2rem] p-5 sm:p-8">
        <input type="hidden" name="returnTo" value="/review" />
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
          검토 페이지 열기
        </button>
      </form>
    </PageShell>
  );
}

function ReviewAdminDisabled() {
  return (
    <PageShell
      eyebrow="관리자 검토"
      title="ADMIN_PASSWORD가 필요합니다"
      description="운영 환경에서 /review를 열려면 Vercel Production 환경변수에 ADMIN_PASSWORD를 설정해 주세요."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-5 text-sm font-semibold leading-6 text-ink/70 sm:p-8">
        이 페이지는 내부 검토용이므로 일반 사용자에게 공개되지 않습니다.
      </div>
    </PageShell>
  );
}

function SectionCard({
  id,
  kicker,
  title,
  description,
  mascot,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  description?: string;
  mascot: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="warm-panel scroll-mt-28 rounded-[2rem] p-5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-persimmon">{kicker}</p>
            <ReviewBadge>검토용</ReviewBadge>
          </div>
          <h2 className="mt-2 break-keep text-2xl font-black leading-tight text-ink sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 break-keep text-sm font-semibold leading-6 text-ink/62">
              {description}
            </p>
          ) : null}
        </div>
        <div className="justify-self-start sm:justify-self-end">{mascot}</div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PricePolicyCard() {
  const premiumProduct = getProductCatalogItem("premium_report");
  const guardianProduct = getProductCatalogItem("guardian_match");

  return (
    <section className="rounded-[2rem] border border-moss/20 bg-white/75 p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <ReviewBadge>검토용 가격 정책</ReviewBadge>
          <h2 className="mt-3 text-xl font-black text-ink">현재 판매 기준</h2>
        </div>
        <PetMascot
          type="cat"
          mood="payment"
          size="md"
          label="가격 정책을 안내하는 고양이 캐릭터"
        />
      </div>
      <div className="mt-5 grid gap-3 text-sm font-bold text-ink/72">
        <p className="flex items-center justify-between gap-4 rounded-2xl bg-berry/10 px-4 py-3 text-berry">
          <span>심층 유료 리포트</span>
          <span>{premiumProduct.price.toLocaleString("ko-KR")}원</span>
        </p>
        <p className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
          <span>추가 콘텐츠</span>
          <span>각 {guardianProduct.price.toLocaleString("ko-KR")}원</span>
        </p>
        <p className="flex items-center justify-between gap-4 rounded-2xl bg-moss/10 px-4 py-3 text-moss">
          <span>PDF 저장</span>
          <span>무료</span>
        </p>
      </div>
    </section>
  );
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;

  if (isProductionRuntime()) {
    if (!isAdminPasswordConfigured()) {
      return <ReviewAdminDisabled />;
    }

    if (!(await hasAdminSession())) {
      return <ReviewAdminLogin error={params.error} />;
    }
  }

  const freeSections = createFreeInsightSections(samplePet).slice(0, 5);
  const premium = generatePremiumReport({
    ...samplePet,
    freeSummary: freeSections.map((section) => section.body).join("\n"),
  });
  const premiumSections = createPremiumSections(premium.report);
  const elementProfile = calculatePetFiveElements(samplePet);
  const namePossessive = postposition.possessive(samplePet.name);
  const hook = generatePetHookFromSajuInput(samplePet);

  return (
    <PageShell
      eyebrow="사람 테스트 · GPT 점검용"
      title="멍냥사주 전체 미리보기"
      description="무료 결과부터 심층 리포트, PDF 저장까지 한 번에 확인하는 검토용 페이지입니다."
    >
      <ReportMobileBar title="전체 미리보기" backHref="/test" rightLabel="입력" rightHref="/input" />
      <ReportSceneBanner
        type="both"
        title="검토용 전체 미리보기"
        bubbleText="무료부터 PDF까지 한 번에 확인해요"
        className="mb-6"
      />
      <div className="mb-6">
        <PetHookCard
          species={samplePet.type}
          hookSentence={hook.hookSentence}
          hookKeyword={hook.hookKeyword}
          hookSubcopy={hook.hookSubcopy}
          highlightWords={hook.highlightWords}
          size="large"
          mascot={
            <PetMascot
              type={samplePet.type}
              mood="star"
              size="lg"
              label="검토용 훅 문장 캐릭터"
            />
          }
        />
      </div>
      <div className="grid gap-7">
        <section className="warm-panel relative overflow-hidden rounded-[2rem] p-5 sm:p-8">
          <div className="absolute right-6 top-6 hidden h-20 w-20 rounded-full bg-persimmon/10 sm:block" />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <ReviewBadge>검토용 통합 페이지</ReviewBadge>
              <h2 className="mt-4 break-keep text-3xl font-black leading-tight text-ink sm:text-5xl">
                무료 맛보기부터 PDF 저장까지 한 번에 살펴봐요
              </h2>
              <p className="mt-4 max-w-2xl break-keep text-base font-semibold leading-8 text-ink/66">
                실제 운영 화면의 핵심 구성을 압축한 페이지입니다. 사람 테스터는
                문구와 상품 구성을 빠르게 볼 수 있고, GPT 점검에는 한 URL로
                무료·결제·유료·PDF 흐름을 전달할 수 있어요.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  `샘플 아이 ${samplePet.name}`,
                  "강아지",
                  `생일 ${samplePet.birthDate}`,
                  `만난 날 ${samplePet.adoptionDate}`,
                  "태어난 시간 모름",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white/75 px-4 py-2 text-sm font-bold text-ink/62 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid justify-items-center rounded-[2rem] border border-berry/10 bg-white/70 p-5">
              <PetMascot
                type="both"
                mood="holding-card"
                size="hero"
                withBubble
                bubbleText="전체 흐름을 같이 확인해요"
                label="함께 리포트 카드를 들고 있는 강아지와 고양이 캐릭터"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
          <nav
            aria-label="검토 섹션 바로가기"
            className="rounded-[2rem] border border-berry/10 bg-white/75 p-4 shadow-sm"
          >
            <p className="px-2 text-sm font-black text-persimmon">
              섹션 바로가기
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
              {anchorItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="focus-ring rounded-2xl bg-cream/70 px-4 py-3 text-sm font-black text-ink/68 transition hover:bg-berry/10 hover:text-berry"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
          <PricePolicyCard />
        </div>

        <SectionCard
          id="review-free"
          kicker="무료 사주 맛보기"
          title={`${namePossessive} 무료 결과 구성`}
          description="결제 전 사용자가 읽게 되는 무료 결과입니다. 카드형 구성과 유료 전환 문구를 함께 확인할 수 있어요."
          mascot={
            <PetMascot
              type="dog"
              mood="holding-card"
              size="md"
              label="무료 사주 맛보기를 안내하는 강아지 캐릭터"
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {freeSections.map((section, index) => (
              <article
                key={section.id}
                className={`rounded-[1.5rem] border border-berry/10 bg-white/78 p-4 ${
                  index === 0 ? "md:col-span-2" : ""
                }`}
              >
                <p className="text-xs font-black text-persimmon">
                  {section.kicker}
                </p>
                <h3 className="mt-2 text-lg font-black text-ink">
                  {section.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-ink/70">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="review-checkout"
          kicker="결제 화면 구성"
          title="정식 결제 전 사용자가 확인하는 내용"
          description="실제 결제 버튼, 환불정책 연결, 즉시 생성 고지, 체크박스 흐름을 검토하기 위한 요약입니다."
          mascot={
            <PetMascot
              type="cat"
              mood="payment"
              size="md"
              label="결제 화면을 안내하는 고양이 캐릭터"
            />
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "상품 요약",
                body: "심층 리포트 2,900원, 추가 콘텐츠 각 1,000원, PDF 저장 무료 정책이 동일하게 표시되어야 합니다.",
              },
              {
                title: "결제 전 고지",
                body: "결제 후 입력 정보를 기준으로 리포트가 즉시 생성되며, 시스템 오류 시 확인 후 환불 처리된다는 안내가 필요합니다.",
              },
              {
                title: "운영 분기",
                body: "테스트 결제와 실패 화면 링크는 DEMO_MODE에서만 보이고, production에서는 실제 결제 흐름만 남아야 합니다.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-moss/15 bg-white/78 p-4"
              >
                <h3 className="text-lg font-black text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink/66">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="review-premium"
          kicker="유료 심층 리포트"
          title={`${namePossessive} 심층 리포트 미리보기`}
          description="실제 유료 리포트 생성 엔진의 문장 품질, 섹션 흐름, 무료 결과와의 차이를 확인하는 영역입니다."
          mascot={
            <PetMascot
              type="both"
              mood="reading"
              size="lg"
              label="심층 리포트를 함께 읽는 강아지와 고양이 캐릭터"
            />
          }
        >
          <div className="grid gap-4">
            {premiumSections.map((section, index) => (
              <article
                id={`review-premium-section-${index + 1}`}
                key={`${section.title}-${index}`}
                className="scroll-mt-28 rounded-[1.5rem] border border-berry/10 bg-white/78 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-persimmon/10 text-xs font-black text-persimmon">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-xs font-black text-persimmon">
                      심층 해석
                    </p>
                    <h3 className="mt-1 text-xl font-black text-ink">
                      {section.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/70">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <section id="review-elements" className="scroll-mt-28">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ReviewBadge>검토용</ReviewBadge>
            <PetMascot
              type="cat"
              mood="star"
              size="sm"
              label="별을 보는 고양이 캐릭터"
            />
            <p className="text-sm font-black text-persimmon">
              오행 밸런스 표시
            </p>
          </div>
          <PetElementBalance
            petName={samplePet.name}
            species={samplePet.type}
            scores={elementProfile.scores}
          />
        </section>

        <SectionCard
          id="review-pdf"
          kicker="PDF 저장 안내"
          title="심층 리포트 구매자에게 PDF 무료 저장 제공"
          description="PDF는 별도 결제 상품처럼 보이지 않아야 하며, premium_report 승인 사용자에게만 서버 권한 검사 후 열립니다."
          mascot={
            <PetMascot
              type="dog"
              mood="pdf"
              size="md"
              label="PDF 문서를 든 강아지 캐릭터"
            />
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-[1.5rem] border border-moss/15 bg-moss/10 p-4">
              <h3 className="text-lg font-black text-ink">PDF 포함 내용</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  "표지",
                  "반려동물 정보",
                  "한 장 요약 카드",
                  "오행 밸런스",
                  "전체 심층 리포트",
                  "생성일",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-2xl bg-white/78 px-4 py-3 text-sm font-bold text-ink/68"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
            <article className="rounded-[1.5rem] border border-berry/10 bg-white/78 p-4">
              <h3 className="text-lg font-black text-ink">권한 기준</h3>
              <ul className="mt-4 grid gap-2 text-sm font-bold leading-6 text-ink/66">
                <li>premium_report 승인 결제가 있어야 PDF 저장 가능</li>
                <li>pdf_report는 0원 정책이며 별도 추가 결제로 보이지 않음</li>
                <li>권한 없는 PDF API 요청은 403으로 차단</li>
                <li>production에서는 데모 PDF 미리보기 숨김</li>
              </ul>
            </article>
          </div>
        </SectionCard>

        <section className="rounded-[2rem] border border-berry/10 bg-white/75 p-5 text-center shadow-sm sm:p-7">
          <PetMascot
            type="both"
            mood="happy"
            size="md"
            label="테스트 시작을 안내하는 강아지와 고양이 캐릭터"
            className="mx-auto mb-4"
          />
          <p className="text-sm font-black text-persimmon">
            실제 흐름 테스트
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">
            입력 화면부터 직접 확인하기
          </h2>
          <p className="mx-auto mt-3 max-w-2xl break-keep text-sm font-semibold leading-6 text-ink/60">
            GPT에는 이 페이지를 공유해 전체 문구와 상품 구성을 검토시키고,
            사람 테스터에게는 입력 화면부터 시작하게 하면 실제 사용 흐름을 더
            자연스럽게 확인할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <PrimaryLink href="/input">입력 화면으로 가기</PrimaryLink>
            <PrimaryLink href="/test" tone="light">
              테스트 안내 보기
            </PrimaryLink>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
