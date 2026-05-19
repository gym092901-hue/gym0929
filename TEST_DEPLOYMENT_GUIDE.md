# 멍냥사주 외부 피드백용 테스트 배포 가이드

이 문서는 다른 사람에게 공유해서 무료 결과, 체크아웃, 테스트 결제 승인, 심층 리포트, PDF 저장 흐름까지 확인하게 만드는 배포 방법입니다.

정식 운영 Production과 반드시 분리해서 사용하세요.

## 권장 방식

- Vercel Production: 실제 출시용
- Vercel Preview: 외부 피드백 테스트용

외부 피드백 링크는 Vercel Preview URL을 공유합니다. Production URL에서는 데모, 테스트 결제, mock payment가 열리지 않습니다.

## Preview 환경변수

Vercel Project Settings > Environment Variables에서 Preview 환경에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_SITE_URL=https://your-preview-url.vercel.app
PUBLIC_REVIEW_MODE=true
DEMO_MODE=false

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...

ADMIN_PASSWORD=...
```

결제 키가 없어도 테스트 결제 승인 버튼으로 심층 리포트까지 볼 수 있습니다.

```env
KAKAOPAY_CLIENT_ID=
KAKAOPAY_SECRET_KEY=
KAKAOPAY_CID=
KAKAOPAY_BASE_URL=https://open-api.kakaopay.com

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.paypal.com
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
```

실제 결제 연동까지 검수하려면 Preview 환경에도 카카오페이/PayPal 테스트 키를 넣고, 각 콘솔의 callback URL을 Preview URL 기준으로 등록합니다.

## Production 환경변수

Production에는 아래처럼 설정합니다.

```env
PUBLIC_REVIEW_MODE=false
DEMO_MODE=false
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

Production에서는 다음 기능이 열리지 않습니다.

- `/demo`
- 테스트 결제 승인
- mock payment 접근권
- 데모 PDF 미리보기
- `demo-mong-2026` 프리미엄 직접 접근
- `/test` 공개 노출

## 외부 테스터에게 공유할 링크

Preview 배포가 완료되면 아래 링크를 공유합니다.

```txt
https://your-preview-url.vercel.app/test
```

테스터가 바로 샘플 유료 리포트까지 확인해야 한다면 아래 링크도 함께 안내할 수 있습니다.

```txt
https://your-preview-url.vercel.app/demo
```

`PUBLIC_REVIEW_MODE=true`인 Preview 배포에서 `/demo`는 고정 샘플 `demo-mong-2026`으로 이동합니다. Supabase가 아직 연결되지 않은 테스트 배포에서도 샘플 무료 결과와 샘플 심층 리포트 확인은 가능합니다. 다만 실제 사용자가 `/input`에서 새로 만든 reading을 여러 서버리스 요청에 걸쳐 안정적으로 테스트하려면 Supabase Preview 환경변수를 넣어두는 편이 좋습니다.

## 테스터 확인 순서

1. `/test`에서 안내와 피드백 항목을 확인합니다.
2. `/input`에서 반려동물 정보를 입력하고 무료 결과를 생성합니다.
3. 무료 결과에서 “심층 리포트 보기”를 누릅니다.
4. 체크아웃 화면에서 확인 체크박스를 선택합니다.
5. Preview 테스트 환경에서만 보이는 테스트 결제 승인 버튼을 누릅니다.
6. 심층 리포트, 탭형 리포트, 종합 리포트, PDF 저장 버튼을 확인합니다.
7. `/test` 하단 피드백 폼으로 의견을 남깁니다.

## 배포 후 확인

Preview URL 기준으로 아래를 확인합니다.

```txt
/test
/demo
/input
/sample
/result/free/[readingId]
/checkout/[readingId]?productType=premium_report
/result/premium/[readingId]
/api/pdf/[readingId]
```

Production URL 기준으로 아래를 확인합니다.

```txt
/sample 200
/test /sample redirect 또는 noindex
/demo 404
/result/free/demo-mong-2026 /sample redirect
/result/premium/demo-mong-2026 404
```

## 주의

- Preview 테스트에도 Supabase 설정을 넣는 것을 권장합니다. 서버리스 환경에서 local reading fallback은 요청 간 상태가 유지되지 않을 수 있습니다.
- 실제 운영 결제 검수는 mock payment가 아니라 카카오페이/PayPal 테스트 또는 운영 콘솔에서 별도로 진행해야 합니다.
- Preview URL을 결제 콘솔 callback에 등록했다면 테스트가 끝난 뒤 정식 운영 callback으로 다시 확인하세요.
