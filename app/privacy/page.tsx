import { PageShell } from "@/components/layout/PageShell";

const policies = [
  {
    title: "수집 항목",
    body:
      "보호자 이메일, 반려동물 이름, 종, 생년월일 또는 만난 날, 태어난 시간 여부 등 리포트 생성을 위한 최소 정보를 수집합니다.",
  },
  {
    title: "이용 목적",
    body:
      "입력 정보는 무료 결과와 유료 리포트 생성, 구매 내역 확인, 고객 문의 대응에 사용됩니다.",
  },
  {
    title: "보관과 삭제",
    body:
      "리포트 재열람과 결제 확인을 위해 필요한 기간 동안 보관하며, 관계 법령상 보관이 필요한 결제 기록은 해당 기간 동안 별도로 보관될 수 있습니다. 삭제 요청이 접수되면 법정 보관 대상 정보를 제외하고 확인 후 삭제합니다.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="개인정보"
      title="개인정보처리방침"
      description="리포트 생성과 결제 확인에 필요한 최소한의 정보 이용 기준을 안내합니다."
      narrow
    >
      <div className="grid gap-4">
        {policies.map((item) => (
          <section key={item.title} className="warm-panel rounded-[2rem] p-5 sm:p-7">
            <h2 className="text-xl font-black text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">{item.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
