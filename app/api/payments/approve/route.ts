import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "공통 승인 API는 실제 결제 연동 이후 비활성화되었습니다. KakaoPay success URL 또는 PayPal capture-order API를 사용하세요.",
    },
    { status: 410 },
  );
}
