do $$ begin
  alter type payment_status add value if not exists 'ready';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type payment_status add value if not exists 'refunded';
exception
  when duplicate_object then null;
end $$;

alter table payments
add column if not exists partner_order_id text,
add column if not exists partner_user_id text,
add column if not exists approval_url text,
add column if not exists cancel_url text,
add column if not exists fail_url text,
add column if not exists raw_request jsonb,
add column if not exists approved_at timestamptz,
add column if not exists failed_at timestamptz,
add column if not exists canceled_at timestamptz,
add column if not exists refunded_at timestamptz;

alter table payments
drop constraint if exists payments_amount_check;

alter table payments
add constraint payments_amount_check check (amount >= 0);

alter table products
drop constraint if exists products_price_check;

alter table products
add constraint products_price_check check (price >= 0);

create index if not exists payments_provider_order_idx
on payments(provider, provider_order_id);

create index if not exists payments_provider_tid_idx
on payments(provider, provider_tid);

create index if not exists payments_partner_order_idx
on payments(partner_order_id);

update products
set
  price = case product_type
    when 'premium_report' then 1990
    when 'guardian_match' then 990
    when 'two_pet_match' then 990
    when 'yearly_fortune' then 990
    when 'pdf_report' then 0
    else price
  end,
  description = case product_type
    when 'premium_report' then '오행 밸런스, 애착 방식, 생활 루틴, 올해의 흐름을 한 번에 읽는 심층 리포트'
    when 'guardian_match' then '보호자와 반려동물의 관계 스타일을 다정하게 읽는 추가 콘텐츠'
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
