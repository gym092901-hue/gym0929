# 멍냥사주 결제 테스트 체크리스트

## 사전 준비

- `.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`을 설정한다.
- 카카오페이 테스트 시 `KAKAOPAY_CLIENT_ID`, `KAKAOPAY_SECRET_KEY`, `KAKAOPAY_CID`, `KAKAOPAY_BASE_URL`을 설정한다.
- PayPal 테스트 시 `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`를 설정한다.
- Supabase migration과 product seed가 적용되어 있는지 확인한다.
- `npm run test`와 `npm run build`가 통과하는지 확인한다.

## 자동 테스트 커버리지

- 무료 결과 생성 API: `tests/api/readingsRoute.test.ts`
- 카카오페이 ready API의 서버 가격 기준 결제 생성: `tests/api/paymentRoutes.test.ts`
- PayPal create-order API의 서버 가격 기준 결제 생성: `tests/api/paymentRoutes.test.ts`
- pending payment 생성과 `provider_tid`, `provider_order_id` 저장: `tests/payment/createPayment.test.ts`
- 결제 승인 처리와 readings 상태 변경: `tests/payment/approvePayment.test.ts`
- 이미 approved인 payment 중복 승인 방지: `tests/payment/approvePayment.test.ts`
- failed/canceled 계열 상태 업데이트와 approved 보호: `tests/payment/updatePaymentStatus.test.ts`
- premium/pdf 등 상품별 approved 결제 접근 확인: `tests/payment/checkPaymentAccess.test.ts`

## 1. 무료 결과 생성

1. `/input`에 접속한다.
2. 반려동물 이름, 강아지/고양이, 생년월일 또는 입양일, 보호자 이메일을 입력한다.
3. 태어난 시간을 모르면 “태어난 시간 모름”을 체크한다.
4. 제출 후 `/result/free/[readingId]`로 이동하는지 확인한다.
5. Supabase `pets`에 입력값이 저장되었는지 확인한다.
6. Supabase `readings`에 `free_summary`와 `status = free_created`가 생성되었는지 확인한다.

## 2. 카카오페이 결제 준비

1. 무료 결과 페이지에서 유료 리포트 결제 버튼을 누른다.
2. `/checkout/[readingId]?productType=premium_report`에 접속되는지 확인한다.
3. 결제 전 확인 체크박스를 모두 선택한다.
4. “카카오페이로 결제하기”를 누른다.
5. `/api/payments/kakao/ready` 응답으로 redirect URL이 반환되고 카카오페이 화면으로 이동하는지 확인한다.
6. Supabase `payments`에 `status = pending`, `provider = kakaopay`, `product_type = premium_report`, `provider_tid`가 저장되었는지 확인한다.
7. `amount`가 클라이언트 값이 아니라 `products.price` 기준인지 확인한다.

## 3. 카카오페이 결제 성공

1. 카카오페이 테스트 결제를 완료한다.
2. `/payment/kakao/success?paymentId=...&readingId=...&pg_token=...`로 돌아오는지 확인한다.
3. 서버에서 approve API가 호출되는지 로그와 `raw_response.approve`로 확인한다.
4. Supabase `payments.status`가 `approved`로 변경되었는지 확인한다.
5. Supabase `readings.status`가 `paid` 또는 리포트 생성 후 `premium_created`가 되는지 확인한다.
6. `/result/premium/[readingId]` 접근이 가능한지 확인한다.

## 4. 카카오페이 결제 실패

1. 카카오페이 결제 화면에서 실패 흐름을 발생시키거나 `/payment/kakao/fail?paymentId=...&readingId=...`로 이동한다.
2. Supabase `payments.status`가 `failed`로 변경되는지 확인한다.
3. `raw_response.fail`에 실패 기록이 저장되는지 확인한다.
4. approved payment가 없는 상태에서 `/result/premium/[readingId]`에 접근하면 checkout으로 redirect되는지 확인한다.

## 5. PayPal Create Order

1. `/checkout/[readingId]?productType=premium_report`에서 결제 전 확인 체크박스를 모두 선택한다.
2. PayPal 버튼 또는 카드 필드가 표시되는지 확인한다.
3. PayPal 결제를 시작한다.
4. `/api/payments/paypal/create-order`가 호출되고 order id가 반환되는지 확인한다.
5. Supabase `payments`에 `status = pending`, `provider = paypal`, `provider_order_id = PayPal order id`가 저장되는지 확인한다.
6. `amount`가 클라이언트 값이 아니라 `products.price` 기준인지 확인한다.

## 6. PayPal Capture

1. PayPal sandbox 결제를 승인한다.
2. `/api/payments/paypal/capture-order`가 호출되는지 확인한다.
3. capture 성공 후 Supabase `payments.status`가 `approved`로 변경되는지 확인한다.
4. `raw_response.capture` 또는 provider capture 응답이 저장되는지 확인한다.
5. 응답의 result URL을 통해 `/result/premium/[readingId]`로 이동하는지 확인한다.

## 7. 미결제 접근 차단

1. approved payment가 없는 readingId를 준비한다.
2. `/result/premium/[readingId]`에 직접 접속한다.
3. `/checkout/[readingId]?productType=premium_report`로 redirect되는지 확인한다.
4. `/api/pdf/[readingId]`를 직접 호출하면 403이 반환되는지 확인한다.

## 8. 중복 승인 방지

1. 이미 `approved` 상태인 paymentId를 준비한다.
2. 같은 paymentId로 카카오페이 success 또는 PayPal capture를 다시 호출한다.
3. 외부 provider approve/capture가 다시 실행되지 않는지 서버 로그로 확인한다.
4. `payments.status`가 계속 `approved`로 유지되는지 확인한다.
5. premium 결과 URL만 반환되는지 확인한다.

## 9. 가격 조작 방지

1. 브라우저 개발자 도구 또는 API 클라이언트로 `amount = 1` 같은 임의 값을 포함해 결제 생성 요청을 보낸다.
2. KakaoPay ready와 PayPal create-order 모두 서버에서 `products.price`를 조회하는지 확인한다.
3. Supabase `payments.amount`가 상품 seed 가격과 동일한지 확인한다.
4. checkout UI의 가격을 바꾸더라도 서버 결제 금액이 변하지 않는지 확인한다.

## 10. 추가 상품 접근 제어

1. `guardian_match`, `two_pet_match`, `yearly_fortune`를 각각 결제한다.
2. 같은 readingId라도 상품별 approved 여부가 따로 적용되는지 확인한다.
3. PDF 무료 저장은 `premium_report` approved 결제가 없으면 403을 반환하는지 확인한다.
4. `premium_report`를 결제한 뒤 PDF 무료 저장이 가능해지는지 확인한다.

## 11. 무료 데모 모드

1. `.env.local`에 `DEMO_MODE=true`, Supabase 서버 환경변수가 설정되어 있는지 확인한다.
2. `NODE_ENV=production`이 아닌 로컬 개발 환경에서 `/demo`에 접속한다.
3. “몽이 무료 데모 시작하기” 버튼을 누른다.
4. Supabase `pets`에 몽이 샘플 데이터가 저장되는지 확인한다.
5. Supabase `readings`에 `free_summary`와 `status = free_created`가 저장되는지 확인한다.
6. `/result/free/[readingId]`에서 실제 DB의 무료 리포트가 출력되는지 확인한다.
7. “유료 리포트 결제하기”로 checkout에 진입한다.
8. DEMO_MODE에서는 실제 카카오페이/PayPal 버튼 대신 “테스트 결제 성공 처리” 버튼만 보이는지 확인한다.
9. 체크박스 3개를 선택하기 전에는 테스트 결제 버튼이 비활성화되는지 확인한다.
10. “테스트 결제 성공 처리”를 누르면 Supabase `payments`에 `provider = mock`, `status = approved`, `amount = 2900`으로 저장되는지 확인한다.
11. `/result/premium/[readingId]`로 이동하고, `readings.premium_report`가 규칙 기반으로 자동 생성되는지 확인한다.
12. `DEMO_MODE=false` 또는 production 빌드에서는 `/demo`, `/api/demo/sample-reading`, `/api/demo/approve-payment`가 비활성화되는지 확인한다.
13. `DEMO_MODE=true`일 때 `/api/payments/kakao/ready`, `/api/payments/paypal/create-order`, `/api/payments/paypal/capture-order`가 실제 외부 API를 호출하지 않고 403을 반환하는지 확인한다.
