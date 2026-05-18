import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

const refundItems = [
  {
    title: "결제 전",
    body:
      "결제 전에는 언제든지 입력 내용을 수정하거나 무료 결과 페이지로 돌아갈 수 있습니다. 생년월일을 모르는 경우에는 입양일 또는 처음 만난 날을 기준으로 리포트가 생성됩니다.",
  },
  {
    title: "디지털 콘텐츠 생성 전",
    body:
      "결제는 완료되었지만 시스템 오류 등으로 리포트가 생성되지 않았거나 열람할 수 없는 상태라면, 결제 기록과 생성 로그를 확인한 뒤 복구 또는 환불을 안내합니다.",
  },
  {
    title: "디지털 콘텐츠 생성·열람 후",
    body:
      "멍냥사주 리포트는 결제 후 입력 정보 기준으로 즉시 생성되는 디지털 콘텐츠입니다. 리포트가 정상 생성되고 열람된 뒤에는 전자상거래 관련 기준에 따라 청약철회 또는 환불이 제한될 수 있습니다.",
  },
  {
    title: "중복 결제 또는 승인 오류",
    body:
      "동일한 readingId와 상품에 대해 중복 승인된 결제가 확인되거나, 결제 승인 후 콘텐츠 접근이 열리지 않는 경우에는 서버의 결제 검증 내역을 기준으로 확인 후 처리합니다.",
  },
  {
    title: "PDF로 저장하기",
    body:
      "PDF 저장 기능은 심층 리포트를 열람한 보호자에게 무료로 제공됩니다. 다운로드가 실패한 경우 다시 시도할 수 있으며, 심층 리포트 자체가 생성되지 않은 경우 환불 기준에 따라 처리합니다.",
  },
];

export default function RefundPage() {
  return (
    <PageShell
      eyebrow="환불정책"
      title="디지털 콘텐츠 환불 기준"
      description="결제 후 즉시 생성되는 리포트의 특성을 기준으로, 생성 전 오류와 생성·열람 후 제한 사항을 구분해 안내합니다."
      narrow
    >
      <div className="grid gap-4">
        <section className="warm-panel rounded-[2rem] p-5 sm:p-7">
          <h2 className="text-xl font-black text-ink">핵심 안내</h2>
          <ul className="mt-3 grid gap-2 text-sm font-semibold leading-7 text-ink/70">
            <li>결제 후 입력 정보 기준으로 리포트가 즉시 생성됩니다.</li>
            <li>시스템 오류로 리포트가 생성되지 않은 경우 확인 후 환불 처리됩니다.</li>
            <li>리포트가 정상 생성·열람된 경우 청약철회가 제한될 수 있습니다.</li>
          </ul>
        </section>

        {refundItems.map((item) => (
          <section key={item.title} className="warm-panel rounded-[2rem] p-5 sm:p-7">
            <h2 className="text-xl font-black text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/70">{item.body}</p>
          </section>
        ))}

        <section className="rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-7">
          <h2 className="text-xl font-black text-moss">문의 전 확인할 정보</h2>
          <p className="mt-3 text-sm leading-7 text-ink/70">
            환불 또는 오류 확인이 필요할 때는 readingId, 결제수단, 결제 시각,
            보호자 이메일을 함께 알려주시면 더 빠르게 확인할 수 있습니다.
          </p>
          <Link
            href="/privacy"
            className="mt-4 inline-flex text-sm font-black text-moss underline decoration-moss/30 underline-offset-4"
          >
            개인정보처리방침 보기
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
