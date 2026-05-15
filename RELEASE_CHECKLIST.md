# 멍냥사주 Release Checklist

정식 운영 배포 전 확인용 체크리스트입니다. LocalTunnel은 외부 임시 검수용으로만 사용하고, 운영 공유 링크는 Vercel Production URL 또는 커스텀 도메인을 사용합니다.

## 1. 배포 전 체크리스트

- [ ] GitHub 저장소에 최신 코드가 push되어 있다.
- [ ] `npm install` 후 의존성 설치가 정상이다.
- [ ] `npm run lint`가 통과한다.
- [ ] `npm run build`가 통과한다.
- [ ] `npm run qa`가 로컬 QA 서버 기준으로 통과한다.
- [ ] Supabase 운영 프로젝트에 migration이 적용되어 있다.
- [ ] Supabase `products` seed 데이터가 운영 DB에 들어가 있다.
- [ ] Vercel Production 환경변수에 `DEMO_MODE=false`가 설정되어 있다.
- [ ] Vercel Production 환경에서 `VERCEL_ENV=production`이 적용되는지 확인했다.
- [ ] KakaoPay 운영 콘솔 callback URL이 운영 도메인으로 등록되어 있다.
- [ ] PayPal 운영 앱 client id/secret과 JS SDK client id가 설정되어 있다.
- [ ] 실제 결제 전 금액이 서버 product config/DB 기준으로 계산되는지 확인했다.
- [ ] PDF API가 `premium_report`와 `pdf_report` 승인 결제를 모두 확인하는지 확인했다.
- [ ] 관리자 비밀번호 `ADMIN_PASSWORD`가 충분히 강한 값으로 설정되어 있다.

## 2. 환경변수 목록

필수값은 `PRODUCTION_ENV.md`를 기준으로 Vercel Project Settings > Environment Variables에 등록합니다.

- `NEXT_PUBLIC_SITE_URL`
- `DEMO_MODE`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KAKAOPAY_CLIENT_ID`
- `KAKAOPAY_SECRET_KEY`
- `KAKAOPAY_CID`
- `KAKAOPAY_BASE_URL`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_BASE_URL`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `ADMIN_PASSWORD`

## 3. Vercel 설정 방법

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: 비워둠
- Production Branch: 운영 브랜치, 보통 `main`
- Node.js Version: Vercel 기본 LTS 또는 프로젝트 호환 버전
- Environment: Production에 운영 환경변수 등록

## 4. Supabase 설정 방법

1. Supabase 운영 프로젝트를 만든다.
2. `supabase/migrations`의 SQL을 순서대로 실행한다.
3. `products` 테이블에 운영 상품 seed가 들어갔는지 확인한다.
4. Vercel에는 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 등록한다.
5. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이며 브라우저 코드에 전달하지 않는다.

## 5. KakaoPay 콜백 URL 목록

`NEXT_PUBLIC_SITE_URL=https://your-domain.example` 기준:

- `https://your-domain.example/payment/kakao/success`
- `https://your-domain.example/payment/kakao/cancel`
- `https://your-domain.example/payment/kakao/fail`

서버는 결제 준비 시 `paymentId`와 `readingId`를 query string으로 붙여 approval/cancel/fail URL을 생성합니다.

## 6. PayPal 콜백 URL 목록

PayPal Buttons/Card Fields 흐름은 checkout 페이지의 JavaScript SDK `onApprove`에서 서버 capture API를 호출합니다.

- Checkout page: `https://your-domain.example/checkout/[readingId]?productType=premium_report`
- Capture API: `https://your-domain.example/api/payments/paypal/capture-order`
- 안내용 success page: `https://your-domain.example/payment/paypal/success`
- 안내용 fail page: `https://your-domain.example/payment/paypal/fail`

## 7. 배포 후 테스트 경로

- `/`
- `/sample`
- `/input`
- `/terms`
- `/privacy`
- `/refund`
- `/admin`

production에서는 아래 데모 경로가 직접 열리면 안 됩니다.

- `/demo`
- `/result/free/demo-mong-2026`
- `/checkout/demo-mong-2026?productType=premium_report&forceCheckout=1`
- `/result/premium/demo-mong-2026`

## 8. Production에서 숨겨져야 하는 기능

- 무료 결과의 데모 검수용 프리미엄 바로 보기
- 테스트 결제 성공 처리 버튼
- 데모 결제 상태 초기화 버튼
- 카카오페이 실패 화면 보기 링크
- 카카오페이 취소 화면 보기 링크
- 페이팔 실패 화면 보기 링크
- 데모 PDF 미리보기
- mock payment 승인
- `demo-mong-2026` 프리미엄 직접 접근

## 9. 최종 보안 확인

- `SUPABASE_SERVICE_ROLE_KEY`, `KAKAOPAY_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`가 `NEXT_PUBLIC_` 접두어를 갖지 않는다.
- 결제 금액은 클라이언트 payload가 아니라 서버의 `products` 테이블과 product config 기준으로 계산한다.
- premium 접근은 `product_type="premium_report"` + `status="approved"`만 인정한다.
- PDF 접근은 `premium_report`와 `pdf_report`가 모두 approved일 때만 허용한다.
