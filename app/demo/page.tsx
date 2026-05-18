import { notFound } from "next/navigation";
import { DemoStartButton } from "@/components/demo/DemoStartButton";
import { PageShell } from "@/components/layout/PageShell";
import { PetMascot } from "@/components/mascot/PetMascot";
import { isDemoModeEnabled } from "@/lib/demo/config";

export default function DemoPage() {
  if (!isDemoModeEnabled()) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="무료 데모"
      title="몽이의 사주 리포트를 바로 체험해보세요"
      description="실제 결제, 카카오페이, PayPal, OpenAI API를 호출하지 않고 Supabase에 샘플 데이터를 저장해 무료 리포트와 유료 리포트 흐름을 확인합니다."
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
              type="dog"
              mood="holding-card"
              size="lg"
              withBubble
              bubbleText="몽이 데모를 시작해볼게요"
              label="데모 리포트 카드를 든 강아지 캐릭터"
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
          <h2 className="text-xl font-black text-ink">데모 모드에서 확인하는 흐름</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-ink/70">
            <p className="rounded-2xl bg-white/70 p-4">
              버튼을 누르면 Supabase에 몽이의 pet/readings 데이터가 저장되고 무료
              리포트 페이지로 이동합니다.
            </p>
            <p className="rounded-2xl bg-white/70 p-4">
              checkout에서는 실제 결제 버튼 대신 데모 결제 승인 버튼만
              노출됩니다.
            </p>
            <p className="rounded-2xl bg-white/70 p-4">
              테스트 승인이 완료되면 payments에 approved mock 결제가 저장되고,
              유료 리포트가 규칙 기반으로 자동 생성됩니다.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
