import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "공통 결제 생성 요청은 비활성화되었습니다. 결제수단별 결제 절차를 이용해 주세요.",
    },
    { status: 410 },
  );
}
