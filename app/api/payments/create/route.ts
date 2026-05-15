import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "공통 결제 생성 API는 비활성화되었습니다. 상품 가격을 서버에서 조회하는 provider별 결제 API를 사용하세요.",
    },
    { status: 410 },
  );
}
