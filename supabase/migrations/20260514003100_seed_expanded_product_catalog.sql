insert into products (product_type, name, price, currency, description, active)
values
  ('premium_report', '우리 아이 심층 사주 리포트', 2900, 'KRW', '오행 기질, 관계 흐름, 루틴 조언을 담은 기본 유료 리포트', true),
  ('guardian_match', '보호자와 우리 아이 궁합 리포트', 1000, 'KRW', '보호자와 반려동물의 관계 스타일을 다정하게 읽는 추가 리포트', true),
  ('two_pet_match', '두 마리 궁합 리포트', 1000, 'KRW', '두 반려동물의 관계 흐름과 생활 공간 조율 포인트', true),
  ('yearly_fortune', '2026년 연간 흐름 리포트', 1000, 'KRW', '2026년의 계절별 생활 흐름과 월별 조언', true),
  ('pdf_report', 'PDF 무료 저장', 0, 'KRW', '심층 리포트 구매자에게 무료로 제공되는 PDF 저장 기능', true)
on conflict (product_type) do update
set
  name = excluded.name,
  price = excluded.price,
  currency = excluded.currency,
  description = excluded.description,
  active = excluded.active;
