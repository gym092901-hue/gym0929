update products
set
  price = case product_type
    when 'premium_report' then 2900
    when 'guardian_match' then 1000
    when 'two_pet_match' then 1000
    when 'yearly_fortune' then 1000
    when 'pdf_report' then 0
    else price
  end,
  description = case product_type
    when 'premium_report' then '오행 기질, 관계 흐름, 루틴 조언을 담은 기본 유료 리포트'
    when 'guardian_match' then '보호자와 반려동물의 관계 스타일을 다정하게 읽는 추가 리포트'
    when 'two_pet_match' then '두 반려동물의 관계 흐름과 생활 공간 조율 포인트'
    when 'yearly_fortune' then '2026년의 계절별 생활 흐름과 월별 조언'
    when 'pdf_report' then '심층 리포트 구매자에게 무료로 제공되는 PDF 저장 기능'
    else description
  end
where product_type in (
  'premium_report',
  'guardian_match',
  'two_pet_match',
  'yearly_fortune',
  'pdf_report'
);
