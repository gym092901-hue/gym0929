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
      "운영 단계에서는 결제 기록 보관 의무와 사용자 삭제 요청을 함께 고려해 보관 기간을 정책화해야 합니다.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy"
      title="개인정보처리방침"
      description="Supabase와 결제 연동 전 기준으로 작성한 개인정보 안내 초안입니다."
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
