import { PageShell } from "@/components/layout/PageShell";
import { AnonymousFeedbackForm } from "@/components/feedback/AnonymousFeedbackForm";
import { PetMascot } from "@/components/mascot/PetMascot";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled, isProductionRuntime } from "@/lib/demo/config";
import { redirect } from "next/navigation";

const productionRuntime = isProductionRuntime();

export const metadata = {
  title: "멍냥사주 베타 테스트 안내",
  description:
    "외부 테스터가 멍냥사주 입력, 무료 결과, 체크아웃, 리포트 화면을 점검할 수 있는 안내 페이지입니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const testSteps = [
  {
    title: "1. 홈과 입력 화면 확인",
    body: "첫 화면의 문구가 이해되는지 보고, 반려동물 이름과 생일 또는 처음 만난 날을 입력해 주세요.",
  },
  {
    title: "2. 무료 결과 읽기",
    body: "무료 결과가 카드별로 잘 나뉘는지, 문장이 자연스러운지, 결제 전환 안내가 부담스럽지 않은지 확인해 주세요.",
  },
  {
    title: "3. 체크아웃 화면 확인",
    body: "상품 가격, 포함 내용, 결제 전 확인 문구, 환불정책 링크가 명확하게 보이는지 봐 주세요.",
  },
  {
    title: "4. 심층 리포트 기대감 확인",
    body: "무료 결과만 보고도 심층 리포트가 어떤 가치를 줄지 충분히 예상되는지 알려주세요.",
  },
];

const feedbackQuestions = [
  "처음 화면에서 무엇을 하는 서비스인지 5초 안에 이해됐나요?",
  "입력 폼에서 막히거나 헷갈린 부분이 있었나요?",
  "무료 결과가 실제 반려생활에 맞는 느낌이었나요?",
  "심층 리포트 가격과 포함 내용이 납득됐나요?",
  "질병, 수명, 사고 예언처럼 불편한 표현이 보였나요?",
  "모바일에서 버튼, 글자, 카드가 답답하거나 깨져 보였나요?",
];

const safetyItems = [
  "테스트 참여자는 실제 카드 정보를 입력하지 않아도 무료 결과를 확인할 수 있습니다.",
  "운영 환경에서는 테스트 결제와 프리미엄 바로보기 기능이 숨겨집니다.",
  "심층 리포트와 PDF는 서버에서 결제 승인 여부를 확인한 뒤에만 열립니다.",
  "리포트는 엔터테인먼트와 반려생활 이해를 위한 콘텐츠이며, 공포감을 주는 예언을 제공하지 않습니다.",
];

export default function TesterPage() {
  if (productionRuntime) {
    redirect("/input");
  }

  const demoModeEnabled = isDemoModeEnabled();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const shareUrl = siteUrl ? `${siteUrl}/test` : "/test";

  return (
    <PageShell
      eyebrow="베타 테스트"
      title="멍냥사주를 먼저 써보고 알려주세요"
      description="정식 출시 전, 다른 보호자들이 실제 사용 흐름을 점검할 수 있도록 만든 테스트 참여 페이지입니다."
    >
      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <p className="text-sm font-black text-persimmon">
            공유용 테스트 링크
          </p>
          <div className="mt-3 rounded-[1.5rem] border border-berry/10 bg-white/80 p-4">
            <p className="break-all text-base font-black leading-7 text-ink sm:text-xl">
              {shareUrl}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              정식 공유는 Vercel 배포 URL 또는 커스텀 도메인을 사용합니다.
              로컬 임시 주소는 운영 검토용으로 쓰지 말고, 배포 후 이 링크를
              테스터에게 전달해 주세요.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PrimaryLink href="/input" className="min-h-14 text-base">
              테스트 시작하기
            </PrimaryLink>
          </div>

          {demoModeEnabled ? (
            <div className="mt-5 rounded-[1.5rem] border border-moss/20 bg-moss/10 p-4">
              <p className="text-sm font-black text-moss">개발 검수 모드</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                현재는 DEMO_MODE가 켜져 있어 내부 검수용 테스트 결제 흐름도
                확인할 수 있습니다. production 배포에서는 이 기능이 자동으로
                숨겨집니다.
              </p>
              <PrimaryLink
                href="/demo"
                tone="moss"
                className="mt-4 w-full sm:w-auto"
              >
                내부 데모 흐름 확인
              </PrimaryLink>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-berry/10 bg-cream/70 p-4">
              <p className="text-sm font-black text-berry">
                운영 테스트 모드
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                지금 페이지에서는 실제 사용자가 보게 될 공개 흐름만 안내합니다.
                결제 승인 전에는 심층 리포트와 PDF가 열리지 않습니다.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-[2rem] border border-berry/10 bg-white/70 p-5 sm:p-6 lg:sticky lg:top-24">
          <PetMascot
            type="cat"
            mood="holding-card"
            size="lg"
            withBubble
            bubbleText="테스트하면서 어색한 곳을 알려주세요"
            label="테스트 안내 카드를 든 고양이 캐릭터"
            className="mb-4 w-full"
          />
          <p className="text-sm font-black text-persimmon">테스터에게 부탁할 것</p>
          <h2 className="mt-2 break-keep text-2xl font-black text-ink">
            “예쁘다”보다 중요한 건 막힘 없는 흐름입니다
          </h2>
          <div className="mt-5 grid gap-3">
            {safetyItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-cream/80 px-4 py-3 text-sm font-bold leading-6 text-ink/70"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {testSteps.map((step) => (
          <article
            key={step.title}
            className="rounded-[2rem] border border-berry/10 bg-white/75 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-persimmon/10">
                <PetMascot
                  type={step.title.includes("체크아웃") ? "cat" : "dog"}
                  mood={
                    step.title.includes("무료")
                      ? "holding-card"
                      : step.title.includes("체크아웃")
                        ? "payment"
                        : step.title.includes("심층")
                          ? "star"
                          : "curious"
                  }
                  size="sm"
                  label={`${step.title} 안내 캐릭터`}
                  className="scale-75"
                />
              </span>
              <h2 className="break-keep text-xl font-black text-ink">
                {step.title}
              </h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-ink/65">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div>
            <p className="text-sm font-black text-moss">피드백 질문</p>
            <h2 className="mt-2 break-keep text-2xl font-black text-ink">
              아래 질문에 답해 달라고 보내면 좋아요
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              별도 피드백 폼을 붙이기 전까지는 이 질문을 카카오톡, 메일,
              구글폼에 그대로 붙여 사용할 수 있습니다.
            </p>
          </div>
          <ol className="grid gap-3">
            {feedbackQuestions.map((question, index) => (
              <li
                key={question}
                className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold leading-6 text-ink/75"
              >
                <span className="mr-2 text-persimmon">{index + 1}.</span>
                {question}
              </li>
            ))}
          </ol>
        </div>
        <AnonymousFeedbackForm />
      </section>
    </PageShell>
  );
}
