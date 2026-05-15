# 멍냥사주 Production Environment Variables

Vercel Production에 등록해야 하는 환경변수 목록입니다.

## 1. 필수 환경변수

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DEMO_MODE=false

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

KAKAOPAY_CLIENT_ID=
KAKAOPAY_SECRET_KEY=
KAKAOPAY_CID=
KAKAOPAY_BASE_URL=https://open-api.kakaopay.com

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.paypal.com
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

ADMIN_PASSWORD=
```

## 2. 브라우저 노출 규칙

브라우저에 노출될 수 있는 값은 `NEXT_PUBLIC_`으로 시작하는 값뿐입니다.

현재 production에서 브라우저 노출이 필요한 값:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`

서버 전용으로만 사용해야 하는 값:

- `SUPABASE_SERVICE_ROLE_KEY`
- `KAKAOPAY_SECRET_KEY`
- `PAYPAL_CLIENT_SECRET`
- `ADMIN_PASSWORD`

`SUPABASE_URL`과 `SUPABASE_ANON_KEY`는 민감도가 낮지만, 현재 앱 구조에서는 서버 중심으로 사용합니다. 브라우저에서 Supabase client를 직접 만들 필요가 생기기 전까지 `NEXT_PUBLIC_SUPABASE_*`로 노출하지 않습니다.

## 3. Production 데모 차단

다음 조건이면 데모 기능은 꺼집니다.

```txt
NODE_ENV=production
또는
VERCEL_ENV=production
```

따라서 실수로 `DEMO_MODE=true`가 들어가도 Vercel Production에서는 데모 기능이 활성화되지 않습니다.

그래도 운영 환경변수에는 반드시 다음처럼 둡니다.

```env
DEMO_MODE=false
```

## 4. NEXT_PUBLIC_SITE_URL 설정

LocalTunnel 주소를 넣지 않습니다. production runtime에서는 `localhost`, `127.0.0.1`, `*.loca.lt`, `*.localtunnel.me` 값을 운영 URL로 인정하지 않습니다.

올바른 예:

```env
NEXT_PUBLIC_SITE_URL=https://meongnyang-saju.vercel.app
NEXT_PUBLIC_SITE_URL=https://meongnyangsaju.com
```

잘못된 예:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://example.loca.lt
```

## 5. KakaoPay 콜백 URL

`NEXT_PUBLIC_SITE_URL=https://your-domain.example` 기준:

```txt
https://your-domain.example/payment/kakao/success
https://your-domain.example/payment/kakao/cancel
https://your-domain.example/payment/kakao/fail
```

앱은 결제 준비 시 다음 query를 붙입니다.

```txt
paymentId=[payment id]
readingId=[reading id]
```

## 6. PayPal URL

PayPal 결제는 JavaScript SDK가 checkout 화면에서 승인 흐름을 처리합니다.

주요 URL:

```txt
https://your-domain.example/checkout/[readingId]?productType=premium_report
https://your-domain.example/api/payments/paypal/create-order
https://your-domain.example/api/payments/paypal/capture-order
https://your-domain.example/payment/paypal/success
https://your-domain.example/payment/paypal/fail
```

## 7. Vercel 등록 방법

1. Vercel Dashboard 접속
2. Project 선택
3. Settings > Environment Variables
4. 위 변수들을 Production 환경에 등록
5. 변경 후 Redeploy

Preview 환경에서 결제 sandbox를 쓰고 싶다면 Preview 값은 별도로 설정합니다. Production에는 운영 결제 값을 넣습니다.

## 8. 배포 후 테스트

운영에서 확인:

```txt
/
/sample
/input
/terms
/privacy
/refund
```

운영에서 차단 확인:

```txt
/demo
/result/free/demo-mong-2026
/checkout/demo-mong-2026?productType=premium_report&forceCheckout=1
/result/premium/demo-mong-2026
```

결제 검증:

- premium은 `premium_report` approved 결제만 접근 가능
- PDF는 `premium_report`와 `pdf_report` approved 결제가 모두 있어야 다운로드 가능
- client에서 보낸 amount는 사용하지 않고 서버 상품 가격만 사용
