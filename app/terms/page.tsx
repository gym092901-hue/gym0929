import { PageShell } from "@/components/layout/PageShell";

const terms = [
  {
    title: "서비스 성격",
    body:
      "멍냥사주는 반려동물과 보호자의 관계를 즐겁게 이해하기 위한 엔터테인먼트 콘텐츠를 제공합니다. 본 서비스는 의학적, 법률적, 전문 상담을 대체하지 않습니다.",
  },
  {
    title: "콘텐츠 이용",
    body:
      "무료 결과와 유료 리포트는 서비스 내 열람을 목적으로 제공됩니다. 무단 복제, 재판매, 자동 수집은 제한될 수 있습니다.",
  },
  {
    title: "결제와 열람",
    body:
      "유료 리포트는 결제 완료가 서버에서 확인된 이후 제공됩니다. 결제 승인 전에는 심층 리포트와 PDF 저장 기능을 이용할 수 없으며, 결제 금액과 승인 여부는 서버 기준으로 확인합니다.",
  },
  {
    title: "디지털 콘텐츠",
    body:
      "심층 리포트는 결제 후 입력 정보 기준으로 즉시 생성되는 디지털 콘텐츠입니다. 정상 생성·열람된 이후에는 환불정책에 따라 청약철회가 제한될 수 있습니다.",
  },
];

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="이용약관"
      title="이용약관"
      description="멍냥사주 이용과 결제, 디지털 콘텐츠 열람 기준을 안내합니다."
      narrow
    >
      <div className="grid gap-4">
        {terms.map((item) => (
          <section key={item.title} className="warm-panel rounded-[2rem] p-5 sm:p-7">
            <h2 className="text-xl font-black text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">{item.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
