# 멍냥사주 운영 결제 QA

정식 운영 배포 전 실제 결제 흐름은 Vercel Production 환경에서 한 번씩 직접 확인합니다. 결제 금액은 클라이언트 입력값이 아니라 서버의 `productCatalog` 기준으로만 계산되어야 합니다.

## 가격 기준

- 심층 리포트 `premium_report`: 1,990원
- 보호자와 우리 아이 궁합 리포트 `guardian_match`: 990원
- 두 마리 궁합 리포트 `two_pet_match`: 990원
- 2026년 연간 흐름 리포트 `yearly_fortune`: 990원
- PDF 저장 `pdf_report`: 무료 저장 기능

## 카카오페이 확인

- Vercel Production 환경변수에 `KAKAOPAY_CLIENT_ID`, `KAKAOPAY_SECRET_KEY`, `KAKAOPAY_CID`, `KAKAOPAY_BASE_URL`, `NEXT_PUBLIC_SITE_URL`이 등록되어 있다.
- `/api/payments/kakao/ready` 호출 시 `premium_report` 금액이 1,990원으로 생성된다.
- 추가 콘텐츠 결제 준비 시 금액이 990원으로 생성된다.
- `pdf_report`는 결제 row를 만들지 않고 심층 리포트 접근권 기준으로 처리된다.
- 카카오페이 결제창 이동이 정상 동작한다.
- 승인 콜백 후 `payments.status`가 `approved`가 되고 `approved_at`이 저장된다.
- 승인 후 심층 리포트와 PDF 저장이 열린다.
- 취소 콜백은 `canceled`, 실패 콜백은 `failed`로 저장되고 접근권이 부여되지 않는다.

## PayPal 확인

- Vercel Production 환경변수에 `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`가 등록되어 있다.
- `/api/payments/paypal/create-order` 호출 시 `premium_report` order 금액이 1,990원으로 생성된다.
- 추가 콘텐츠 order 금액이 990원으로 생성된다.
- `pdf_report`는 PayPal order를 만들지 않는다.
- capture 성공 후 `payments.status`가 `approved`가 되고 `approved_at`이 저장된다.
- capture 금액이나 통화가 서버 기준과 다르면 `failed`로 처리되고 접근권이 부여되지 않는다.

## 접근권 확인

- 결제 전 `/result/premium/[readingId]`는 checkout으로 이동한다.
- 결제 전 `/api/pdf/[readingId]`는 403을 반환한다.
- 승인된 `premium_report` 결제만 심층 리포트 접근권으로 인정한다.
- `failed`, `canceled`, `refunded` 상태는 접근권으로 인정하지 않는다.
- Production에서는 `mock` provider 결제가 접근권으로 인정되지 않는다.

## 운영 UI 확인

- Production에서 테스트 결제 버튼이 보이지 않는다.
- Production에서 실패 화면 보기 링크가 보이지 않는다.
- Production에서 개발 전용 PDF 미리보기 기능이 보이지 않는다.
- 결제 환경변수가 없으면 실제 결제 버튼 대신 “결제 준비 중입니다” 안내가 보인다.

## Vercel 환경변수

- `NEXT_PUBLIC_SITE_URL`
- `DEMO_MODE=false`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `KAKAOPAY_CLIENT_ID`
- `KAKAOPAY_SECRET_KEY`
- `KAKAOPAY_CID`
- `KAKAOPAY_BASE_URL`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_BASE_URL`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

`SUPABASE_SERVICE_ROLE_KEY`, `KAKAOPAY_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.
