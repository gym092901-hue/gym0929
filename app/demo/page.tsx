import { notFound } from "next/navigation";
import { DemoStartButton } from "@/components/demo/DemoStartButton";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { isDemoModeEnabled } from "@/lib/demo/config";

export const metadata = {
  title: "멍냥사주 데모",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DemoPage() {
  if (!isDemoModeEnabled()) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="무료 데모"
      title="몽이의 사주 리포트를 바로 체험해보세요"
      description="실제 결제나 외부 유료 서비스를 연결하지 않고, 샘플 데이터로 무료 결과부터 심층 리포트 흐름까지 확인합니다."
      narrow
    >
      <div className="grid gap-6">
        <section className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-sm font-black text-persimmon">
                샘플 반려동물
              </p>
              <h2 className="mt-2 text-2xl font-black text-ink">몽이</h2>
            </div>
            <PetMascot
              species="dog"
              mood="holding-card"
              size="lg"
              withBubble
              bubbleText="몽이 데모를 시작해볼게요"
              label="몽이 샘플 리포트를 안내하는 강아지 캐릭터"
              decorative={false}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["종류", "강아지"],
              ["생년월일", "2021-05-14"],
              ["태어난 시간", "모름"],
              ["입양일", "2021-08-20"],
              ["보호자 이메일", "test@example.com"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-berry/10 bg-white/70 px-4 py-3"
              >
                <p className="text-xs font-black uppercase text-ink/45">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <DemoStartButton />
          </div>
        </section>

        <section className="rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-6">
          <h2 className="text-xl font-black text-ink">
            데모 모드에서 확인하는 흐름
          </h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-ink/70">
            <p className="rounded-2xl bg-white/70 p-4">
              버튼을 누르면 몽이의 샘플 정보가 저장되고 무료 결과 페이지로
              이동합니다.
            </p>
            <p className="rounded-2xl bg-white/70 p-4">
              체크아웃에서는 실제 결제 대신 데모 승인 버튼으로 결제 완료 상태를
              확인합니다.
            </p>
            <p className="rounded-2xl bg-white/70 p-4">
              승인 후에는 심층 리포트와 PDF 저장 흐름까지 한 번에 점검할 수
              있습니다.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
