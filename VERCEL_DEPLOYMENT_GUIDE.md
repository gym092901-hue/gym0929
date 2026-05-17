# 멍냥사주 Vercel Deployment Guide

이 문서는 멍냥사주를 GitHub 저장소 기준으로 Vercel에 정식 배포하는 절차를 정리합니다.

## 1. 배포 구조

- App: Next.js on Vercel
- Database: Supabase hosted Postgres
- Payment: KakaoPay online one-time payment, PayPal Orders API + JavaScript SDK
- Domain: Vercel production URL 또는 커스텀 도메인

운영 공유 링크는 Vercel Production URL 또는 커스텀 도메인만 사용합니다. 로컬 터널 주소는 결제 callback, GPT 검토, 사용자 테스트 링크로 사용하지 않습니다.

## 2. GitHub 준비

1. GitHub에 새 repository를 만든다.
2. 프로젝트 루트에서 변경사항을 commit/push한다.
3. Vercel에서 해당 GitHub repository를 import한다.

필수 npm scripts:

```json
{
  "dev": "next dev --hostname 127.0.0.1",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "qa": "tsx scripts/qa-check.ts"
}
```

## 3. Vercel 프로젝트 설정

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`
- Development Command: `npm run dev`
- Output Directory: 비워둠
- Production Environment Variables: `PRODUCTION_ENV.md` 기준으로 입력

배포 후 `NEXT_PUBLIC_SITE_URL`은 반드시 실제 운영 URL로 바꿉니다.
로컬 터널 URL은 운영 결제 callback으로 사용할 수 없으며, production에서는 `localhost`, `127.0.0.1`, `*.loca.lt`, `*.localtunnel.me` 값을 운영 URL로 인정하지 않습니다.

예:

```env
NEXT_PUBLIC_SITE_URL=https://meongnyang-saju.vercel.app
```

커스텀 도메인을 연결했다면:

```env
NEXT_PUBLIC_SITE_URL=https://meongnyangsaju.com
```

## 4. Supabase 설정 방법

1. Supabase에서 Production 프로젝트 생성
2. SQL Editor에서 `supabase/migrations` 파일을 파일명 순서대로 실행
3. `pets`, `readings`, `payments`, `products` 테이블 생성 확인
4. `products` seed 확인
5. Project Settings > API에서 URL과 key 확인
6. Vercel에 다음 값을 등록

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.

## 5. KakaoPay 설정

Vercel Production URL 기준 callback:

```txt
https://your-domain.example/payment/kakao/success
https://your-domain.example/payment/kakao/cancel
https://your-domain.example/payment/kakao/fail
```

Vercel 환경변수:

```env
KAKAOPAY_CLIENT_ID=
KAKAOPAY_SECRET_KEY=
KAKAOPAY_CID=
KAKAOPAY_BASE_URL=https://open-api.kakaopay.com
```

결제 준비 API는 서버에서만 카카오페이 secret key를 사용합니다.

## 6. PayPal 설정

Vercel 환경변수:

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.paypal.com
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
```

PayPal 카드 정보는 PayPal JavaScript SDK가 처리합니다. 멍냥사주 서버에는 카드 번호, CVV가 저장되거나 전송되지 않습니다.

운영 확인 경로:

```txt
https://your-domain.example/checkout/[readingId]?productType=premium_report
https://your-domain.example/api/payments/paypal/create-order
https://your-domain.example/api/payments/paypal/capture-order
```

## 7. 배포 후 테스트 경로

운영에서 열려야 하는 경로:

```txt
/
/sample
/input
/terms
/privacy
/refund
```

결제 데이터가 있는 실제 reading 기준:

```txt
/result/free/[readingId]
/checkout/[readingId]?productType=premium_report
/result/premium/[readingId]
/result/premium/[readingId]에서 PDF 무료 저장 버튼 확인
/api/pdf/[readingId]
```

운영에서 차단되어야 하는 데모 경로:

```txt
/demo
/result/free/demo-mong-2026
/checkout/demo-mong-2026?productType=premium_report&forceCheckout=1
/result/premium/demo-mong-2026
```

## 8. Production에서 숨겨져야 하는 기능

- 데모 검수용 프리미엄 바로 보기
- 테스트 결제 성공 처리
- 데모 결제 상태 초기화
- 실패/취소 화면 보기 링크
- 데모 결제 기능
- mock payment 인정

## 9. 배포 후 권장 QA

1. `/input`에서 새 무료 리포트 생성
2. 무료 결과에서 premium checkout 이동
3. 체크박스 미선택 시 결제 버튼 비활성 확인
4. KakaoPay ready redirect 확인
5. KakaoPay success에서 서버 approve 확인
6. PayPal create-order/capture-order 확인
7. 결제 전 premium 직접 접근 시 checkout redirect 확인
8. 심층 리포트 결제 전 `/api/pdf/[readingId]` 403 확인
9. 심층 리포트 결제 후 PDF 무료 저장 파일명 확인
10. `/admin` 비밀번호 보호 확인
